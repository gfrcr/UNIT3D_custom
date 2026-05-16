#!/usr/bin/env bash
# Local dev launcher: starts dev-watch.js (rebuilds outputs on src/ change) and
# relink-override.js (keeps Chrome Local Overrides hardlink fresh) in background
# with auto-restart on crash. Logs to scripts/dev-*.log; PIDs to scripts/dev.pid.
#
# Usage:
#   scripts/dev.sh start    # spawn both watchers (idempotent)
#   scripts/dev.sh stop     # kill watchers
#   scripts/dev.sh status   # show running PIDs
#   scripts/dev.sh logs     # tail both logs
#   scripts/dev.sh          # alias for start

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PID_FILE="scripts/dev.pid"
WATCH_LOG="scripts/dev-watch.log"
RELINK_LOG="scripts/dev-relink.log"

running() {
  [ -f "$PID_FILE" ] || return 1
  while IFS= read -r pid; do
    kill -0 "$pid" 2>/dev/null && return 0
  done < "$PID_FILE"
  return 1
}

start() {
  if running; then
    echo "already running (see $PID_FILE)"
    status
    return 0
  fi
  : > "$WATCH_LOG"
  : > "$RELINK_LOG"
  ( while true; do node scripts/dev-watch.js; sleep 1; done ) >> "$WATCH_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  ( while true; do node scripts/relink-override.js; sleep 1; done ) >> "$RELINK_LOG" 2>&1 &
  echo $! >> "$PID_FILE"
  sleep 0.3
  echo "started:"
  status
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "no pid file; nothing to stop"
    return 0
  fi
  while IFS= read -r pid; do
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
  echo "stopped"
}

status() {
  if [ ! -f "$PID_FILE" ]; then
    echo "not running"
    return 0
  fi
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      ps -o pid=,etime=,args= -p "$pid" 2>/dev/null || true
    else
      echo "$pid (dead)"
    fi
  done < "$PID_FILE"
}

logs() {
  exec tail -F "$WATCH_LOG" "$RELINK_LOG"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  restart) stop; start ;;
  *) echo "usage: $0 {start|stop|status|logs|restart}"; exit 1 ;;
esac
