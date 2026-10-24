#!/usr/bin/env python3
import json
import os
import subprocess
import sys

version = 'v' + json.load(open('desktop/package.json'))['version']
command = [sys.executable, 'scripts/publish-desktop-s3.py',
           '--version', version,
           '--platform', os.environ['PLATFORM'],
           '--artifacts', 'desktop/dist',
           '--bucket', os.environ['S3_BUCKET'],
           '--prefix', os.environ['S3_RELEASE_PREFIX'],
           '--public-base', os.environ['S3_PUBLIC_BASE']]
if os.environ['PLATFORM'] == 'linux-amd64':
    command += ['--gnupg-home', os.environ['GNUPGHOME'],
                '--public-key', os.path.join(os.environ['RUNNER_TEMP'], 'release.asc')]
subprocess.run(command, check=True)
