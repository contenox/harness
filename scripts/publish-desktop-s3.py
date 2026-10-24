#!/usr/bin/env python3
import argparse
import hashlib
import json
import pathlib
import shutil
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


def sha256sums(files, destination):
    lines = [f'{digest(path)}  {path.name}\n' for path in files]
    destination.write_text(''.join(lines))
    return {path.name: digest(path) for path in files}


def aws(*args, capture=False):
    command = ['aws', *args, '--no-cli-pager']
    result = subprocess.run(command, check=True, capture_output=capture, text=True)
    return result.stdout if capture else None


def upload(bucket, key, path, content_type=None):
    s3 = f's3://{bucket}/{key}'
    if subprocess.run(['aws', 's3api', 'head-object', '--bucket', bucket, '--key', key],
                      capture_output=True, text=True).returncode == 0:
        raise SystemExit(f'refusing to overwrite existing object: {key}')
    args = ['s3', 'cp', str(path), s3, '--only-show-errors']
    if content_type:
        args.extend(['--content-type', content_type])
    aws(*args)


def public(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read()
    return data


def verify_rpm(public_url, public_key, temporary):
    rpm = temporary / 'public.rpm'
    rpm.write_bytes(public(public_url))
    database = temporary / 'rpmdb'
    database.mkdir()
    subprocess.run(['rpm', '--dbpath', str(database), '--initdb'], check=True)
    subprocess.run(['rpm', '--dbpath', str(database), '--import', str(public_key)], check=True)
    result = subprocess.run(['rpmkeys', '--dbpath', str(database), '--checksig', str(rpm)],
                            check=True, capture_output=True, text=True)
    if 'signatures OK' not in result.stdout:
        raise SystemExit(f'public RPM is unsigned: {result.stdout}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    parser.add_argument('--artifacts', required=True, type=pathlib.Path)
    parser.add_argument('--bucket', required=True)
    parser.add_argument('--prefix', required=True)
    parser.add_argument('--public-base', required=True)
    parser.add_argument('--gnupg-home', required=True, type=pathlib.Path)
    parser.add_argument('--public-key', required=True, type=pathlib.Path)
    args = parser.parse_args()

    prefix = args.prefix.strip('/')
    public_base = args.public_base.rstrip('/')
    version = args.version.strip('/')
    output = pathlib.Path(tempfile.mkdtemp(prefix='desktop-release-'))
    release_entries = []
    temporary = pathlib.Path(tempfile.mkdtemp(prefix='verify-'))

    key_text = subprocess.run(
        ['gpg', '--batch', '--homedir', str(args.gnupg_home), '--with-colons', '--list-secret-keys'],
        check=True, capture_output=True, text=True).stdout
    fingerprint = next(line.split(':')[9] for line in key_text.splitlines() if line.startswith('fpr:'))

    existing = None
    s3_index = f's3://{args.bucket}/{prefix}/index.json'
    result = subprocess.run(['aws', 's3', 'cp', s3_index, '-', '--only-show-errors'],
                            capture_output=True, text=True)
    if result.returncode == 0:
        existing = json.loads(result.stdout)

    for platform, extensions in PLATFORMS.items():
        directory = output / version / platform
        directory.mkdir(parents=True)
        files = []
        for extension in extensions:
            matches = sorted(args.artifacts.glob(f'Contenox-*{extension}'))
            matches = [path for path in matches if not path.name.endswith('.asc')]
            if len(matches) != 1:
                raise SystemExit(f'expected one {platform} {extension}, found {matches}')
            target = directory / matches[0].name
            shutil.copy2(matches[0], target)
            files.append(target)

        if platform == 'linux-amd64':
            rpm = next(path for path in files if path.suffix == '.rpm')
            subprocess.run(['rpmsign', '--define', f'_gpg_name {fingerprint}',
                            '--define', f'_gpg_path {args.gnupg_home.resolve()}',
                            '--addsign', str(rpm)], check=True)
            database = temporary / 'local-rpmdb'
            database.mkdir()
            subprocess.run(['rpm', '--dbpath', str(database), '--initdb'], check=True)
            subprocess.run(['rpm', '--dbpath', str(database), '--import', str(args.public_key)], check=True)
            checked = subprocess.run(['rpmkeys', '--dbpath', str(database), '--checksig', str(rpm)],
                                     check=True, capture_output=True, text=True)
            if 'signatures OK' not in checked.stdout:
                raise SystemExit(f'local RPM is unsigned: {checked.stdout}')

        checksums = directory / 'SHA256SUMS'
        hashes = sha256sums(files, checksums)
        subprocess.run(['gpg', '--batch', '--homedir', str(args.gnupg_home),
                        '--local-user', fingerprint, '--armor', '--detach-sign',
                        '--output', str(directory / 'SHA256SUMS.asc'), str(checksums)], check=True)
        shutil.copy2(args.public_key, directory / 'contenox-release.asc')

        artifacts = []
        for path in files:
            artifacts.append({
                'name': path.name,
                'path': f'{version}/{platform}/{path.name}',
                'sha256': hashes[path.name],
                'size': path.stat().st_size,
            })
            relative = f'{version}/{platform}/{path.name}'
            upload(args.bucket, f'{prefix}/{relative}', path)
            public_url = f'{public_base}/{relative}'
            if path.suffix == '.rpm':
                verify_rpm(public_url, args.public_key, temporary)
            else:
                if hashlib.sha256(public(public_url)).hexdigest() != hashes[path.name]:
                    raise SystemExit(f'public artifact differs: {relative}')

        for filename in ('SHA256SUMS', 'SHA256SUMS.asc', 'contenox-release.asc'):
            relative = f'{version}/{platform}/{filename}'
            upload(args.bucket, f'{prefix}/{relative}', directory / filename)
            if public(f'{public_base}/{relative}') != (directory / filename).read_bytes():
                raise SystemExit(f'public file differs: {relative}')

        release_entries.append({
            'version': version,
            'platform': platform,
            'artifacts': artifacts,
            'checksums': f'{version}/{platform}/SHA256SUMS',
            'checksumSigned': True,
            'signature': f'{version}/{platform}/SHA256SUMS.asc',
            'signingKey': f'{version}/{platform}/contenox-release.asc',
        })

    releases = [] if existing is None else existing.get('releases', [])
    releases = [release for release in releases
                if not (release.get('version') == version and release.get('platform') in PLATFORMS)]
    releases.extend(release_entries)
    releases.sort(key=lambda release: (release.get('version', ''), release.get('platform', '')))
    index = {'schema': 1, 'releases': releases}
    index_path = output / 'index.json'
    index_path.write_text(json.dumps(index, indent=2) + '\n')
    upload(args.bucket, f'{prefix}/index.json', index_path, 'application/json')
    if public(f'{public_base}/index.json') != index_path.read_bytes():
        raise SystemExit('public index differs')
    print(f'published {version}: {public_base}/index.json')


if __name__ == '__main__':
    main()
