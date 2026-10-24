import argparse
import hashlib
import os
import pathlib
import subprocess


def primary_fingerprint(home, public_key=None, secret=False):
    command = ['gpg', '--batch', '--with-colons']
    if home is not None:
        command.extend(['--homedir', str(home.resolve())])
    command.append('--list-secret-keys' if secret else '--show-keys')
    if public_key is not None:
        command.append(str(public_key.resolve()))
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    primary = 'sec' if secret else 'pub'
    records = [line.split(':') for line in result.stdout.splitlines()]
    fingerprints = []
    for index, record in enumerate(records):
        if record[0] != primary:
            continue
        for following in records[index + 1:]:
            if following[0] == 'fpr':
                fingerprints.append(following[9])
                break
            if following[0] in ('pub', 'sec'):
                break
    if len(fingerprints) != 1:
        kind = 'secret' if secret else 'public'
        raise ValueError(f'expected exactly one primary {kind} key, found {len(fingerprints)}')
    return fingerprints[0]


def main():
    parser = argparse.ArgumentParser(description='Sign the RPM, when present, and the final checksum manifest of one platform package.')
    parser.add_argument('directory', type=pathlib.Path)
    parser.add_argument('--gnupg-home', required=True, type=pathlib.Path)
    parser.add_argument('--public-key', required=True, type=pathlib.Path)
    args = parser.parse_args()
    signing_key = primary_fingerprint(args.gnupg_home, secret=True)
    release_key = primary_fingerprint(None, public_key=args.public_key)
    if signing_key != release_key:
        raise ValueError(f'secret key {signing_key} does not match release key {release_key}')
    artifacts = sorted(path for path in args.directory.iterdir()
                       if path.name.startswith('Contenox-') and path.suffix in ('.deb', '.rpm', '.exe', '.zip'))
    suffixes = sorted(path.suffix for path in artifacts)
    if suffixes == ['.deb', '.rpm']:
        rpm = next(path for path in artifacts if path.suffix == '.rpm')
        subprocess.run(['rpmsign', '--define', f'_gpg_name {signing_key}', '--define',
                        f'_gpg_path {args.gnupg_home.resolve()}', '--addsign', str(rpm)], check=True,
                       env={**os.environ, 'GNUPGHOME': str(args.gnupg_home.resolve())})
    elif suffixes != ['.exe', '.zip']:
        raise ValueError('expected exactly one DEB and one RPM, or one Windows installer and one ZIP')
    lines = []
    for artifact in artifacts:
        with artifact.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        lines.append(f'{digest}  {artifact.name}\n')
    checksums = args.directory / 'SHA256SUMS'
    checksums.write_text(''.join(lines))
    subprocess.run(['gpg', '--batch', '--homedir', str(args.gnupg_home.resolve()),
                    '--local-user', signing_key,
                    '--armor', '--detach-sign', '--yes', '--output',
                    str(args.directory / 'SHA256SUMS.asc'), str(checksums)], check=True)


if __name__ == '__main__':
    main()
