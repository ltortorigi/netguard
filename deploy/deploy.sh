#!/usr/bin/env bash
set -euo pipefail
# Executed as the dedicated deployment user on the existing GCP VM.
sha="${1:?A commit SHA is required}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit SHA'; exit 1; }
base=/opt/netguard
release="$base/releases/$sha"
mkdir -p "$release"
tar -xzf "/tmp/netguard-$sha.tar.gz" -C "$release"
cd "$release"
npm ci --omit=dev
previous="$(readlink -f "$base/current" || true)"
ln -sfn "$release" "$base/current-next"
mv -Tf "$base/current-next" "$base/current"
sudo -n systemctl restart netguard
ok=false
for attempt in {1..15}; do
  if curl -fsS http://127.0.0.1:3000/api/health | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const h=JSON.parse(s);process.exit(h.status==='ok'&&h.storage==='MongoDB'?0:1)})"; then
    ok=true
    break
  fi
  sleep 2
done
if [[ "$ok" != true ]]; then
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "$base/current-next"
    mv -Tf "$base/current-next" "$base/current"
    sudo -n systemctl restart netguard
  fi
  echo 'Health check failed; previous release restored when available.'
  exit 1
fi
rm -f "/tmp/netguard-$sha.tar.gz"
printf 'Verified MongoDB-backed release %s\n' "$sha"
