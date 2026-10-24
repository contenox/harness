#!/usr/bin/env python3
import argparse
import hashlib
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
PREFIX_TOKENS = {'linux-amd64': '-linux-', 'windows-amd64': '-win-', 'macos-arm64': '-mac-'}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def aws(*args):
    subprocess.run(['aws', *args, '--no-cli-pager', '--only-show-errors'], check=True)


def public(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    parser.add_argument('--platform', required=True, choices=sorted(PLATFORMS))
    parser.add_argument('--artifacts', required=True, type=pathlib.Path)
    parser.add_argument('--bucket', required=True)
    parser.add_argument('--prefix', required=True)
    parser.add_argument('--public-base', required=True)
    parser.add_argument('--gnupg-home', type=pathlib.Path)
    parser.add_argument('--public-key', type=pathlib.Path)
    args = parser.parse_args()

    version = args.version.strip('/')
    prefix = args.prefix.strip('/')
    base = args.public_base.rstrip('/')
    token = PREFIX_TOKENS[args.platform]
    extensions = PLATFORMS[args.platform]

    files = []
    for extension in extensions:
        matches = [path for path in args.artifacts.glob(f'Contenox-*{extension}')
                   if token in path.name and not path.name.endswith('.asc')]
        if len(matches) != 1:
            raise SystemExit(f'expected one {args.platform} {extension}, found {matches}')
        files.append(matches[0])

    temporary = pathlib.Path(tempfile.mkdtemp(prefix='desktop-publish-'))
    directory = temporary / version / args.platform
    directory.mkdir(parents=True)

    if args.platform == 'linux-amd64':
        for path in files:
            shutil.copy2(path, directory / path.name)
        files = [directory / path.name for path in files]
    else:
        for path in files:
            shutil.copy2(path, directory / path.name)
        files = [directory / path.name for path in files]

    for path in files:
        relative = f'{version}/{args.platform}/{path.name}'
        aws('s3', 'cp', str(path), f's3://{args.bucket}/{prefix}/{relative}')
        if hashlib.sha256(public(f'{base}/{relative}')).hexdigest() != digest(path):
            raise SystemExit(f'public artifact differs: {relative}')
    print(f'published {args.platform} {version}')


if __name__ == '__main__':
    main()
