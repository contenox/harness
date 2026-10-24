#!/usr/bin/env bash
set -euo pipefail
rpm_dir="${1:-desktop/dist}"
: "${GNUPGHOME:?GNUPGHOME must point at the imported release signing key}"
: "${RELEASE_PUBLIC_KEY_FILE:?RELEASE_PUBLIC_KEY_FILE must point at the release public key}"
image="${RPM_SIGN_IMAGE:-opensuse/tumbleweed:latest}"
test -d "$rpm_dir"
rpm=$(find "$rpm_dir" -maxdepth 1 -name '*.rpm' -print -quit)
test -n "$rpm"
echo "signing $rpm in $image"
docker run --rm \
  -e "RPM_PATH=/work/$rpm" \
  -v "$PWD:/work" \
  -v "$GNUPGHOME:/gnupg:ro" \
  -v "$RELEASE_PUBLIC_KEY_FILE:/release-public.asc:ro" \
  -w /work "$image" bash -lc '
set -euo pipefail
zypper -n install -y gpg2 rpm gawk >/dev/null
cp -a /gnupg /tmp/gnupg
chmod 700 /tmp/gnupg
export GNUPGHOME=/tmp/gnupg
fpr=$(gpg --batch --with-colons --list-secret-keys | awk -F: "/^fpr:/ {print \$10; exit}")
test -n "$fpr"
before=$(sha256sum "$RPM_PATH" | cut -d" " -f1)
rpmsign --define "_gpg_name $fpr" --define "_gpg_path $GNUPGHOME" --addsign "$RPM_PATH"
after=$(sha256sum "$RPM_PATH" | cut -d" " -f1)
test "$before" != "$after" || { echo "rpmsign did not change the package" >&2; exit 1; }
mkdir -p /tmp/rpmdb
rpm --dbpath /tmp/rpmdb --initdb
rpm --dbpath /tmp/rpmdb --import /release-public.asc
rpmkeys --dbpath /tmp/rpmdb -Kv "$RPM_PATH" | tee /tmp/check.txt
grep -q "signatures OK" /tmp/check.txt
'
