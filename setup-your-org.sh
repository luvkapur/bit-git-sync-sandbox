#!/usr/bin/env bash
# Re-point this demo workspace at YOUR bit.cloud scope.
# Usage: ./setup-your-org.sh <owner.scope>     e.g. ./setup-your-org.sh acme.demos
set -euo pipefail
SCOPE="${1:?usage: ./setup-your-org.sh <owner.scope> (create the scope on bit.cloud first)}"
echo "→ pointing workspace at $SCOPE"
# 1. defaultScope
sed -i.bak "s/\"defaultScope\": \"[^\"]*\"/\"defaultScope\": \"$SCOPE\"/" workspace.jsonc && rm workspace.jsonc.bak
# 2. re-track the sample component fresh (the shipped .bitmap pins the demo scope's versions)
rm -f .bitmap
bit init >/dev/null
bit add test/sync-probe --id sync-probe >/dev/null
bit install
# 3. seed YOUR scope with the baseline (main)
bit tag --message "baseline for the sync demo" >/dev/null
bit export
# 4. commit the reconfigured workspace
git add workspace.jsonc .bitmap && git commit -m "chore: configure the sync demo for $SCOPE"
echo ""
echo "✓ workspace configured and baseline exported to https://bit.cloud/${SCOPE%%.*}/${SCOPE#*.}"
echo ""
echo "Remaining one-time setup (see TESTING.md 'Bring your own org'):"
echo "  1. git push (this commit) to YOUR fork"
echo "  2. Repo secret BIT_CONFIG_ACCESS_TOKEN = your bit.cloud token (single line!)"
echo "  3. Repo setting: Actions → General → 'Allow GitHub Actions to create and approve pull requests'"
echo "  4. bit.cloud org webhook (create FRESH, never edit): Components→Export succeeded,"
echo "     URL https://api.github.com/repos/<you>/<fork>/dispatches,"
echo "     headers Authorization: Bearer <GitHub PAT (repo scope)> + Accept: application/vnd.github+json,"
echo "     custom template: {\"event_type\":\"bit-export\",\"client_payload\":{\"laneId\":\"{{laneId}}\",\"componentIds\":\"{{componentIds}}\",\"owner\":\"{{owner}}\",\"actor\":\"{{username}}\"}}"
