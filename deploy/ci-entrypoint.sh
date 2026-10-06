#!/usr/bin/env bash
# The ONLY thing the CI deploy key may run. It is installed in
# ~deploy/.ssh/authorized_keys as a forced command:
#
#   restrict,command="/srv/scoreplot/ci-entrypoint.sh" ssh-ed25519 AAAA... scoreplot-github-actions
#
# so a leaked CI secret can publish a static site into /srv/scoreplot/www and
# nothing else: no shell, no other commands, no port forwarding.
#
# CI sends:  deploy   (as the SSH command)
# and a gzipped tar of web/dist on stdin.
#
# Layout (Caddy mounts /srv/scoreplot/www read-only and serves ./current):
#   www/releases/<timestamp>/   one directory per deploy
#   www/current -> releases/<timestamp>
set -euo pipefail

BASE=/srv/scoreplot/www
KEEP=3
MAX_BYTES=$((50 * 1024 * 1024))

fail() {
  echo "ci-entrypoint: $1" >&2
  logger -t scoreplot-deploy "rejected: $1 (from ${SSH_CLIENT%% *})" 2>/dev/null || true
  exit 1
}

[ "${SSH_ORIGINAL_COMMAND:-}" = "deploy" ] || fail "only 'deploy' is allowed"

release="$(date -u +%Y%m%dT%H%M%SZ)"
dir="$BASE/releases/$release"
mkdir -p "$dir"
trap 'rm -rf "$dir"' EXIT

# GNU tar refuses absolute paths and ".." members by default.
head -c "$MAX_BYTES" | tar -xz --no-same-owner -C "$dir"
[ -f "$dir/index.html" ] || fail "archive has no index.html"
find "$dir" -type l -print -quit | grep -q . && fail "archive contains symlinks"

# Atomic switch: build the new symlink beside the old one, then rename over it.
ln -sfn "releases/$release" "$BASE/current.new"
mv -T "$BASE/current.new" "$BASE/current"
trap - EXIT

# Prune old releases, keeping the newest $KEEP.
ls -1dt "$BASE"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf

logger -t scoreplot-deploy "deployed $release"
echo "deployed $release"
