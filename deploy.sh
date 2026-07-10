#!/usr/bin/env bash
#
# Deploy local source -> VPS over rsync, then rebuild/restart only what changed.
#
# Why rsync (not git): this repo's git history is effectively unused (a near-empty
# baseline + ~1500 uncommitted working-tree files, including a 129M venv and 1300
# uploaded-media files under static/). rsync with a curated exclude list pushes
# ONLY source code and leaves runtime state (.env, uploaded media, DB, node_modules,
# venv, divergent alembic history) untouched on the VPS.
#
# Prereqs (one-time):
#   1. SSH key access so `ssh $VPS_HOST` needs no password.
#   2. The repo already exists at $VPS_DIR on the VPS (it does) with its own .env
#      files and uploaded media in place.
#   3. `rsync` installed on both ends (standard on macOS + Debian/Ubuntu).
#
# Usage:
#   ./deploy.sh --dry-run      # SHOW what would change on the VPS, touch nothing (DO THIS FIRST)
#   ./deploy.sh                # sync, then auto rebuild UIs / restart backend as needed
#   ./deploy.sh --no-build     # sync only, don't rebuild/restart anything
#
set -euo pipefail

# ---- CONFIG: edit these two for your VPS -----------------------------------
VPS_HOST="${VPS_HOST:-root@YOUR_VPS_IP}"     # e.g. root@123.45.67.89  (or a ~/.ssh/config alias)
VPS_DIR="${VPS_DIR:-/root/ielts-main}"       # path to the repo on the VPS (no trailing slash)
# ----------------------------------------------------------------------------

DRY=""
DO_BUILD=1
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY="--dry-run" ;;
    --no-build) DO_BUILD=0 ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

SRC="$(cd "$(dirname "$0")" && pwd)/"   # this repo dir, with trailing slash

# Things that must NEVER be pushed (runtime state, secrets, build junk, local-only).
# Keeping these on the VPS side is the whole point.
EXCLUDES=(
  --exclude '.git/'
  --exclude '.deploy-backup-*/'          # backups this script makes on the VPS
  --exclude '.env'                       # secrets — every .env at any depth
  --exclude '**/.env'
  --exclude 'node_modules/'
  --exclude 'venv*/'                     # venv, venv313, any local virtualenv (129M+ each)
  --exclude '__pycache__/'
  --exclude '*.pyc'
  --exclude 'build/'                     # frontend build outputs (rebuilt on VPS)
  --exclude 'dist/'
  --exclude 'ielts-practice-backend/static/'   # uploaded media — prod owns this
  --exclude 'mysql/'                     # DB data dir
  --exclude 'dump.rdb'
  --exclude 'nginx/'                     # live SSL certs + prod nginx config — VPS owns this
  --exclude 'alembic.ini'                # hardcodes the DB URL: VPS=@db:3306, local=@localhost
  --exclude 'alembic/versions/'          # local & VPS alembic histories diverge on purpose
  --exclude 'ielts-practice-backend/alembic/versions/'
  --exclude '*.bak'
  --exclude '*.swp'
  --exclude '.DS_Store'
  --exclude '=*'                         # junk from a stray `pip install >=x` command
  --exclude '*.sql'
  --exclude '*.sql.gz'
)

echo "==> rsync ${DRY:-(LIVE)}  $SRC  ->  $VPS_HOST:$VPS_DIR/"
# -a archive, -z compress, -i itemize changes, --delete OMITTED on purpose so we
# never remove VPS files that aren't in our tree (safer). On the first live run we
# also keep overwritten files via --backup so nothing is lost.
BACKUP_OPTS=()
if [ -z "$DRY" ]; then
  BACKUP_OPTS=(--backup --backup-dir="$VPS_DIR/.deploy-backup-$(date +%Y%m%d-%H%M%S)")
fi

CHANGED="$(rsync -azi $DRY "${BACKUP_OPTS[@]}" "${EXCLUDES[@]}" \
  -e ssh "$SRC" "$VPS_HOST:$VPS_DIR/" | grep -E '^[<>ch.][fdL]' || true)"

if [ -z "$CHANGED" ]; then
  echo "==> No source changes to push."
  exit 0
fi

echo "----- changed files -----"
echo "$CHANGED"
echo "-------------------------"

if [ -n "$DRY" ]; then
  echo "==> DRY RUN only. Re-run without --dry-run to apply."
  exit 0
fi

if [ "$DO_BUILD" -eq 0 ]; then
  echo "==> --no-build: skipped rebuild/restart. Changed files are on the VPS."
  exit 0
fi

# Decide what to act on, based on which paths changed.
REBUILD_USER=0; REBUILD_ADMIN=0; RESTART_BACKEND=0
echo "$CHANGED" | grep -q 'ielts-tajun/'          && REBUILD_USER=1
echo "$CHANGED" | grep -q 'ielts-practice-ui/'    && REBUILD_ADMIN=1
echo "$CHANGED" | grep -q 'ielts-practice-backend/' && RESTART_BACKEND=1
# A compose/nginx change is a full-stack concern — surface it, don't auto-act.
echo "$CHANGED" | grep -qE 'docker-compose.yml|nginx/' && \
  echo "!! docker-compose.yml or nginx/ changed — review and apply manually on the VPS."

CMDS=""
[ "$RESTART_BACKEND" -eq 1 ] && CMDS="$CMDS docker-compose restart backend;"
[ "$REBUILD_ADMIN" -eq 1 ]   && CMDS="$CMDS docker-compose up -d --build admin-ui;"
[ "$REBUILD_USER" -eq 1 ]    && CMDS="$CMDS docker-compose up -d --build user-ui;"

if [ -n "$CMDS" ]; then
  echo "==> On VPS: $CMDS"
  ssh "$VPS_HOST" "cd $VPS_DIR && $CMDS"
fi

echo "==> Done."
echo "    Backend code is volume-mounted, so a restart is enough (no rebuild)."
echo "    If you added a migration, run it manually on the VPS:"
echo "      ssh $VPS_HOST 'cd $VPS_DIR && docker-compose exec backend alembic upgrade head'"
