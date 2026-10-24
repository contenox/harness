#!/usr/bin/env python3
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile
import urllib.request

PLATFORMS = {
    'linux-amd64': ('.deb', '.rpm'),
    'windows-amd64': ('.exe', '.zip'),
    'macos-arm64': ('.dmg', '.zip'),
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def aws(*args, capture=False):
    result = subprocess.run(['aws', *args, '--no-cli-pager'], check=True,
                            capture_output=capture, text=True)
    return result.stdout if capture else None


def public(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def verify_rpm(url, public_key, temporary):
    target = temporary / 'public.rpm'
    target.write_bytes(public(url))
    database = temporary / 'rpmdb'
    database.mkdir(exist_ok=True)
    subprocess.run(['rpm', '--dbpath', str(database), '--initdb'], check=True)
    subprocess.run(['rpm', '--dbpath', str(database), '--import', str(public_key)], check=True)
    result = subprocess.run(['rpmkeys', '--dbpath', str(database), '--checksig', str(target)],
                            check=True, capture_output=True, text=True)
    if 'signatures OK' not in result.stdout:
        raise SystemExit(f'public RPM is unsigned: {result.stdout}')
    header = subprocess.run(['rpm', '-qp', '--qf', '%{RSAHEADER:pgpsig}', str(target)],
                            check=True, capture_output=True, text=True).stdout.strip()
    if not header or header == '(none)':
        raise SystemExit('public RPM has no RSAHEADER signature')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    parser.add_argument('--bucket', required=True)
    parser.add_argument('--prefix', required=True)
    parser.add_argument('--public-base', required=True)
    parser.add_argument('--gnupg-home', required=True, type=pathlib.Path)
    parser.add_argument('--public-key', required=True, type=pathlib.Path)
    args = parser.parse_args()

    version = args.version.strip('/')
    prefix = args.prefix.strip('/')
    base = args.public_base.rstrip('/')
    temporary = pathlib.Path(tempfile.mkdtemp(prefix='desktop-index-'))
    key_text = subprocess.run(
        ['gpg', '--batch', '--homedir', str(args.gnupg_home), '--with-colons', '--list-secret-keys'],
        check=True, capture_output=True, text=True).stdout
    fingerprint = next(line.split(':')[9] for line in key_text.splitlines() if line.startswith('fpr:'))

    existing = None
    result = subprocess.run(['aws', 's3', 'cp', f's3://{args.bucket}/{prefix}/index.json', '-', '--only-show-errors'],
                            capture_output=True, text=True)
    if result.returncode == 0:
        existing = json.loads(result.stdout)

    entries = []
    for platform, extensions in PLATFORMS.items():
        s3_prefix = f'{prefix}/{version}/{platform}/'
        keys = aws('s3api', 'list-objects-v2', '--bucket', args.bucket, '--prefix', s3_prefix,
                   '--query', 'Contents[].Key', '--output', 'text', capture=True).split()
        names = []
        for key in keys:
            name = key.rsplit('/', 1)[-1]
            if name.startswith('Contenox-') and any(name.endswith(ext) for ext in extensions):
                names.append(name)
        if len(names) != len(extensions):
            raise SystemExit(f'{platform}: expected {extensions}, found {names}')

        directory = temporary / platform
        directory.mkdir()
        artifacts = []
        for name in sorted(names):
            target = directory / name
            aws('s3', 'cp', f's3://{args.bucket}/{prefix}/{version}/{platform}/{name}', str(target), '--only-show-errors')
            sha = digest(target)
            artifacts.append({'name': name, 'path': f'{version}/{platform}/{name}',
                              'sha256': sha, 'size': target.stat().st_size})
            observed = public(f'{base}/{version}/{platform}/{name}')
            if hashlib.sha256(observed).hexdigest() != sha:
                raise SystemExit(f'public artifact differs: {version}/{platform}/{name}')
            if platform == 'linux-amd64' and name.endswith('.rpm'):
                verify_rpm(f'{base}/{version}/{platform}/{name}', args.public_key, temporary)

        sums = directory / 'SHA256SUMS'
        sums.write_text(''.join(f'{item["sha256"]}  {item["name"]}\n' for item in artifacts))
        subprocess.run(['gpg', '--batch', '--homedir', str(args.gnupg_home), '--local-user', fingerprint,
                        '--armor', '--detach-sign', '--output', str(directory / 'SHA256SUMS.asc'), str(sums)],
                       check=True)
        for filename in ('SHA256SUMS', 'SHA256SUMS.asc'):
            aws('s3', 'cp', str(directory / filename), f's3://{args.bucket}/{prefix}/{version}/{platform}/{filename}',
                '--only-show-errors')
            if public(f'{base}/{version}/{platform}/{filename}') != (directory / filename).read_bytes():
                raise SystemExit(f'public file differs: {version}/{platform}/{filename}')
        aws('s3', 'cp', str(args.public_key), f's3://{args.bucket}/{prefix}/{version}/{platform}/contenox-release.asc',
            '--only-show-errors')
        if public(f'{base}/{version}/{platform}/contenox-release.asc') != args.public_key.read_bytes():
            raise SystemExit(f'public key differs: {version}/{platform}')

        entries.append({
            'version': version,
            'platform': platform,
            'artifacts': artifacts,
            'checksums': f'{version}/{platform}/SHA256SUMS',
            'checksumSigned': True,
            'signature': f'{version}/{platform}/SHA256SUMS.asc',
            'signingKey': f'{version}/{platform}/contenox-release.asc',
        })

    releases = [] if existing is None else existing.get('releases', [])
    releases = [item for item in releases
                if not (item.get('version') == version and item.get('platform') in PLATFORMS)]
    releases.extend(entries)
    releases.sort(key=lambda item: (item.get('version', ''), item.get('platform', '')))
    index = {'schema': 1, 'releases': releases}
    index_path = temporary / 'index.json'
    index_path.write_text(json.dumps(index, indent=2) + '\n')
    aws('s3', 'cp', str(index_path), f's3://{args.bucket}/{prefix}/index.json',
        '--content-type', 'application/json', '--only-show-errors')
    if public(f'{base}/index.json') != index_path.read_bytes():
        raise SystemExit('public index differs')
    print(f'indexed {version}: {base}/index.json')


if __name__ == '__main__':
    main()
