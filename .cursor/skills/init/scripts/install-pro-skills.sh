#!/usr/bin/env bash
# Install ZER0 stack-matched pro skills into .cursor/skills and .agents/skills.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
CURSOR_SKILLS_DIR="${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}"
CURSOR_PRO_SKILLS_DIR="${CURSOR_PRO_SKILLS_DIR:-$CURSOR_SKILLS_DIR/language-pro}"

FORCE=0
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --only)
      ONLY="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--force] [--only skill1,skill2]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Default set for ai-qa-orchestrator / ZER0
DEFAULT_SKILLS=(
  javascript
  react
  python-pro
  xlsx
  pdf
  build-check
  simplify
  dark-mode
  design-foundations
)

if [[ -n "$ONLY" ]]; then
  IFS=',' read -r -a SKILLS <<< "$ONLY"
else
  SKILLS=("${DEFAULT_SKILLS[@]}")
fi

resolve_source() {
  local name="$1"
  if [[ -f "$CLAUDE_SKILLS_DIR/$name/SKILL.md" ]]; then
    echo "$CLAUDE_SKILLS_DIR/$name"
    return 0
  fi
  if [[ -f "$CURSOR_PRO_SKILLS_DIR/$name/SKILL.md" ]]; then
    echo "$CURSOR_PRO_SKILLS_DIR/$name"
    return 0
  fi
  if [[ -f "$CURSOR_SKILLS_DIR/$name/SKILL.md" ]]; then
    echo "$CURSOR_SKILLS_DIR/$name"
    return 0
  fi
  return 1
}

install_one() {
  local name="$1"
  local src dest_cursor dest_agents

  if ! src="$(resolve_source "$name")"; then
    echo "MISSING  $name  (no source under $CLAUDE_SKILLS_DIR or $CURSOR_SKILLS_DIR)"
    return 1
  fi

  dest_cursor="$ROOT/.cursor/skills/$name"
  dest_agents="$ROOT/.agents/skills/$name"

  if [[ -f "$dest_cursor/SKILL.md" && "$FORCE" -eq 0 ]]; then
    # Keep agents mirror in sync even when cursor copy exists
    mkdir -p "$(dirname "$dest_agents")"
    rm -rf "$dest_agents"
    cp -R "$dest_cursor" "$dest_agents"
    echo "SKIP     $name  (already in .cursor/skills; mirrored to .agents/skills)"
    return 0
  fi

  mkdir -p "$ROOT/.cursor/skills" "$ROOT/.agents/skills"
  rm -rf "$dest_cursor" "$dest_agents"
  cp -R "$src" "$dest_cursor"
  cp -R "$src" "$dest_agents"
  echo "INSTALL  $name  ← $src"
  return 0
}

echo "ZER0 init — installing pro skills into:"
echo "  $ROOT/.cursor/skills"
echo "  $ROOT/.agents/skills"
echo

installed=0
skipped=0
missing=0

for name in "${SKILLS[@]}"; do
  name="${name#"${name%%[![:space:]]*}"}"
  name="${name%"${name##*[![:space:]]}"}"
  [[ -z "$name" ]] && continue
  if ! install_one "$name"; then
    missing=$((missing + 1))
  fi
done

# Recount from filesystem for accurate summary
for name in "${SKILLS[@]}"; do
  name="${name#"${name%%[![:space:]]*}"}"
  name="${name%"${name##*[![:space:]]}"}"
  [[ -z "$name" ]] && continue
  if [[ -f "$ROOT/.cursor/skills/$name/SKILL.md" && -f "$ROOT/.agents/skills/$name/SKILL.md" ]]; then
    installed=$((installed + 1))
  fi
done

echo
echo "Done. Present: $installed / ${#SKILLS[@]}  |  Missing source: $missing"
echo "Invoke with /javascript /react /python-pro /xlsx /pdf /build-check /simplify /dark-mode /design-foundations"
