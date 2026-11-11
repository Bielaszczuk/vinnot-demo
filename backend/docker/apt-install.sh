#!/bin/sh
# Installs Ubuntu packages even when archive.ubuntu.com or Canonical's DNS is down (#544).
#
# The official archive is tried first. Mirrors on other domains are the fallback, so an
# outage of ubuntu.com name resolution does not stop CI or an image build. Every mirror
# serves the same signed archive: apt verifies it against the Ubuntu archive key.
#
# Usage: apt-install.sh [apt-get install arguments...] package...
set -eu

. /etc/os-release
codename="$VERSION_CODENAME"
keyring=/usr/share/keyrings/ubuntu-archive-keyring.gpg

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/parts"
chmod 755 "$work"

# Keep the first three mirrors that serve this release's index right now.
healthy=0
for mirror in \
    http://archive.ubuntu.com/ubuntu \
    http://security.ubuntu.com/ubuntu \
    http://mirrors.edge.kernel.org/ubuntu \
    http://mirrors.mit.edu/ubuntu \
    http://mirror.us.leaseweb.net/ubuntu \
    http://ftp.halifax.rwth-aachen.de/ubuntu; do
    [ "$healthy" -eq 3 ] && break
    if timeout 30 /usr/lib/apt/apt-helper -o APT::Sandbox::User=root -o Acquire::Retries=0 \
        download-file "$mirror/dists/$codename/InRelease" "$work/probe" >/dev/null 2>&1; then
        echo "$mirror" >> "$work/mirrors.txt"
        healthy=$((healthy + 1))
    else
        echo "Skipping $mirror: it does not answer" >&2
    fi
done
[ "$healthy" -gt 0 ] || { echo "No Ubuntu mirror answers" >&2; exit 1; }
chmod 644 "$work/mirrors.txt"
echo "Ubuntu mirrors: $(tr '\n' ' ' < "$work/mirrors.txt")" >&2

for suite in "$codename" "$codename-updates" "$codename-security"; do
    echo "deb [signed-by=$keyring] mirror+file:$work/mirrors.txt $suite main universe"
done > "$work/sources.list"

apt_get() {
    apt-get -o Dir::Etc::SourceList="$work/sources.list" -o Dir::Etc::SourceParts="$work/parts" \
        -o Acquire::Retries=2 -o Acquire::http::Timeout=30 "$@"
}

for attempt in 1 2 3; do
    if apt_get update && apt_get install -y --no-install-recommends "$@"; then
        exit 0
    fi
    [ "$attempt" -eq 3 ] && break
    echo "APT failed (attempt $attempt of 3); retrying" >&2
    sleep $((attempt * 20))
done
echo "APT failed after 3 attempts" >&2
exit 1
