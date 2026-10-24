#!/usr/bin/env python3

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BUCKET = "contenox-website-assets-573643652148"
PREFIX = "media"
PUBLIC_ROOT = f"https://{BUCKET}.s3.amazonaws.com/{PREFIX}"
WEBSITE_ROOT = Path(__file__).resolve().parents[1]
WEBSITE_MANIFEST = WEBSITE_ROOT / "src" / "data" / "showcase.json"
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
CONTENT_TYPES = {"webm": "video/webm", "mp4": "video/mp4", "webp": "image/webp"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def aws_executable() -> str:
    found = shutil.which("aws") or shutil.which("aws.exe")
    if found:
        return found
    raise RuntimeError("AWS CLI is required to publish showcase media")


def public_bytes(url: str) -> bytes | None:
    request = Request(url, headers={"Cache-Control": "no-cache"})
    try:
        with urlopen(request, timeout=60) as response:
            if response.status != 200:
                raise RuntimeError(f"public verification returned HTTP {response.status}: {url}")
            return response.read()
    except HTTPError as error:
        if error.code in (403, 404):
            return None
        raise


def upload(aws: str, path: Path, name: str, content_type: str) -> str:
    data = path.read_bytes()
    sha = digest(data)
    object_name = f"{name}-{sha}{path.suffix.lower()}"
    url = f"{PUBLIC_ROOT}/{object_name}"
    current = public_bytes(url)
    if current is not None:
        if digest(current) != sha:
            raise RuntimeError(f"public object conflicts with its content-addressed name: {url}")
        return url
    completed = subprocess.run(
        [
            aws, "s3api", "put-object",
            "--bucket", BUCKET,
            "--key", f"{PREFIX}/{object_name}",
            "--body", str(path),
            "--content-type", content_type,
            "--cache-control", "public,max-age=31536000,immutable",
            "--if-none-match", "*",
        ],
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        current = public_bytes(url)
        if current is None or digest(current) != sha:
            raise RuntimeError(completed.stderr.strip() or f"AWS CLI failed to publish {object_name}")
        return url
    published = public_bytes(url)
    if published is None or published != data:
        raise RuntimeError(f"public bytes failed verification: {url}")
    return url


def write_manifest(poster: str, sources: list[dict[str, str]]) -> None:
    manifest = {"schema": 1, "poster": poster, "sources": sources}
    WEBSITE_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=WEBSITE_MANIFEST.parent, delete=False) as output:
        json.dump(manifest, output, indent=2)
        output.write("\n")
        temporary = Path(output.name)
    temporary.replace(WEBSITE_MANIFEST)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--poster", required=True, help="reviewed poster image (.webp)")
    parser.add_argument("--webm", help="reviewed WebM film")
    parser.add_argument("--mp4", help="reviewed MP4 film")
    parser.add_argument("--slug", default="contenox-harness-workbench", help="object name prefix")
    args = parser.parse_args()

    if not SLUG.fullmatch(args.slug):
        raise SystemExit("slug must be kebab-case")
    poster = Path(args.poster)
    if poster.suffix.lower() != ".webp":
        raise SystemExit("poster must be WebP, like the bucket's other posters")

    aws = aws_executable()
    poster_url = upload(aws, poster, f"{args.slug}-poster", CONTENT_TYPES["webp"])
    sources = []
    if args.webm:
        sources.append({"src": upload(aws, Path(args.webm), args.slug, CONTENT_TYPES["webm"]), "type": "video/webm"})
    if args.mp4:
        sources.append({"src": upload(aws, Path(args.mp4), args.slug, CONTENT_TYPES["mp4"]), "type": "video/mp4"})
    write_manifest(poster_url, sources)
    print(f"published and verified showcase media; updated {WEBSITE_MANIFEST.relative_to(WEBSITE_ROOT)}")


if __name__ == "__main__":
    main()
