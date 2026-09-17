#!/bin/sh
# Fails when the Claude Code plugin's copy of the skill differs from the portable one.
# `.agents/skills/landed/SKILL.md` is the single source (Codex reads it there); the plugin
# cannot point outside its own folder, so it carries a copy. `pnpm check` and CI call this.
set -eu
cd "$(dirname "$0")/.."
source=.agents/skills/landed/SKILL.md
copy=plugins/landed/skills/landed/SKILL.md
if ! diff -u "$source" "$copy"; then
  echo "The plugin's skill copy is out of date. Edit $source, then run 'cp $source $copy'." >&2
  exit 1
fi
echo "The plugin's skill copy matches $source."
