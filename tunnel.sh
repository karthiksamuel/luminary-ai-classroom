#!/usr/bin/env bash
# tunnel.sh — expose luminary services via Cloudflare quick tunnels
#
# Usage:
#   ./tunnel.sh            # tunnel backend (3002) + manim (3001)
#   ./tunnel.sh --no-manim # tunnel backend only (when using AMD cloud server)
#
# Tunnels are torn down automatically when you Ctrl-C.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_ENV="$ROOT/frontend/.env.local"
BACKEND_ENV="$ROOT/backend/.env"

NO_MANIM=false
for arg in "$@"; do [[ "$arg" == "--no-manim" ]] && NO_MANIM=true; done

# ── prerequisites ──────────────────────────────────────────────────────────

if ! command -v cloudflared &>/dev/null; then
  echo "cloudflared not found. Install it with:"
  echo "  brew install cloudflared"
  exit 1
fi

# ── helpers ────────────────────────────────────────────────────────────────

update_env() {           # update_env <file> <KEY> <value>
  local file="$1" key="$2" val="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# Watch cloudflared output for the trycloudflare.com URL.
# When found, call the supplied callback with the URL.
watch_tunnel() {         # watch_tunnel <label> <port> <callback>
  local label="$1" port="$2" callback="$3"
  cloudflared tunnel --url "http://localhost:${port}" 2>&1 | while IFS= read -r line; do
    printf '[%s] %s\n' "$label" "$line"
    if [[ "$line" =~ (https://[a-zA-Z0-9-]+\.trycloudflare\.com) ]]; then
      "$callback" "${BASH_REMATCH[1]}"
    fi
  done
}

# ── callbacks ──────────────────────────────────────────────────────────────

on_backend_url() {
  local url="$1"
  update_env "$FRONTEND_ENV" "VITE_BACKEND_URL" "$url"
  echo ""
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  Backend tunnel ready                               │"
  echo "│  $url"
  echo "│                                                     │"
  echo "│  VITE_BACKEND_URL updated in frontend/.env.local    │"
  echo "│  → restart  npm run dev:avp  to pick it up          │"
  echo "└─────────────────────────────────────────────────────┘"
  echo ""
}

on_manim_url() {
  local url="$1"
  update_env "$BACKEND_ENV" "MANIM_API_URL" "$url"
  echo ""
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  Manim tunnel ready                                 │"
  echo "│  $url"
  echo "│                                                     │"
  echo "│  MANIM_API_URL updated in backend/.env              │"
  echo "│  → restart the Python backend to pick it up         │"
  echo "└─────────────────────────────────────────────────────┘"
  echo ""
}

# ── start ──────────────────────────────────────────────────────────────────

PIDS=()

cleanup() {
  echo ""
  echo "Shutting down tunnels..."
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Cloudflare tunnels..."
echo ""

watch_tunnel "backend" "3002" "on_backend_url" &
PIDS+=($!)

if [[ "$NO_MANIM" == "false" ]]; then
  watch_tunnel "manim  " "3001" "on_manim_url" &
  PIDS+=($!)
fi

wait
