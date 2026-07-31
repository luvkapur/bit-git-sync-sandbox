# Test bit-git-sync yourself — step by step

This repository is a working demo of bi-directional Bit lane ↔ GitHub PR sync, running a
from-source build of `bit ci sync` ([teambit/bit#10541](https://github.com/teambit/bit/pull/10541)).

Two ways to use it:

- **Path A — quick tour (luvktest members only):** this repo as-is is wired to the
  `luvktest.test` scope; if you have write access there, skip straight to the tests.
- **Path B — bring your own org (anyone):** fork/clone, run one setup script against
  **your** bit.cloud scope, add two settings and one webhook, and the whole demo runs
  against your own org and repo.

## Path B — configure for YOUR org (one-time, ~10 min)

```bash
# 0. Fork this repo on GitHub, then:
git clone https://github.com/<you>/<your-fork>.git && cd <your-fork>

# 1. Create a scope on bit.cloud (UI: New scope, e.g. acme.demos), then:
./setup-your-org.sh acme.demos     # re-points the workspace, re-tracks the sample
                                   # component, exports the baseline to YOUR scope
git push
```

Then three one-time settings on YOUR fork/org:

1. **Repo secret** `BIT_CONFIG_ACCESS_TOKEN` — your bit.cloud token
   (`bit config get user.token`, **last line only — it must be a single line**).
2. **Repo setting** Actions → General → ✅ *Allow GitHub Actions to create and approve pull requests*.
3. **bit.cloud org webhook** (Settings → Webhooks → **create fresh; editing a webhook drops
   its headers — recreate instead of edit**):
   - Event: *Components → Export succeeded*
   - URL: `https://api.github.com/repos/<you>/<your-fork>/dispatches`
   - Headers: `Authorization: Bearer <GitHub PAT with repo scope>` and
     `Accept: application/vnd.github+json`
   - Template (Custom):
     `{"event_type":"bit-export","client_payload":{"laneId":"{{laneId}}","componentIds":"{{componentIds}}","owner":"{{owner}}","actor":"{{username}}"}}`

No other secrets are needed — the workflows pull the public from-source bit branch read-only
(`FORK_SYNC_TOKEN` is maintainer-only and skipped on forks).

In the tests below, replace `luvktest.test` with your scope.

## Prerequisites (one-time)

```bash
# 1. bit CLI (any recent version — the new sync command runs server-side, not on your machine)
npx @teambit/bvm install

# 2. GitHub CLI, authenticated
gh auth status   # or: gh auth login

# 3. bit.cloud login with access to the luvktest org
bit login
```

## Path A setup (luvktest members, one command)

```bash
git clone https://github.com/luvkapur/bit-git-sync-sandbox.git
cd bit-git-sync-sandbox
bit install     # ~30s; workspace is preconfigured for scope luvktest.test
```

Either path: you now hold **both personas** — a Bit developer (lane side, works from any
workspace anywhere) and a git developer (branch side, works in the repo clone). The repo is a
*projection* of lane activity, not the lane's home.

## Test 1 — Lane → PR, hands-free — from ANYWHERE (~3 min)

**The point of this test: the lane developer never touches the git repository.** A lane is an
ephemeral repo — you can work on it from any workspace, on any machine. The git repo syncs
itself the moment you export.

```bash
# In a fresh directory — NOT the repo clone. Any machine, any path.
mkdir /tmp/anywhere && cd /tmp/anywhere
bit init --default-scope luvktest.test        # ← your scope on Path B
bit import luvktest.test/sync-probe           # pull the component into your workspace
bit lane create my-test-<yourname>
echo "export const hello = '<yourname> was here';" >> $(find . -name sync-probe.ts | head -1)
bit snap --message "my first synced change"
bit export
```

Now **touch nothing** and watch the *repository*:
- Actions tab → a `bit-sync-from-source` run appears within seconds (the bit.cloud webhook
  triggered it — no human, no cron, and nothing you did referenced the repo).
- ~4 min later (warm cache): a branch and a pull request named `Lane sync: luvktest.test/my-test-<yourname>`
  exist, authored by `github-actions`, containing your actual source change.

The repo clone from Setup is only needed when you act as the *git-side* developer (Tests 2–4).

## Test 2 — PR branch → lane (~5 min)

```bash
git fetch origin && git checkout my-test-<yourname>
echo "export const fromGit = 'this line was born in git';" >> test/sync-probe/index.ts
git commit -am "a change from the git side" && git push origin my-test-<yourname>
gh workflow run bit-sync-from-source.yml -f lane=my-test-<yourname>
```

Watch the run, then verify on the Bit side:

```bash
bit lane import luvktest.test/my-test-<yourname>   # or view the lane on bit.cloud
```

Your git-born line is now a snap on the lane — the runner performed a real `bit snap` + export.

## Test 3 — Conflict safety (~5 min)

Edit the **same line** of `test/sync-probe/sync-probe.ts` twice: once via `bit snap` + `bit export`
on the lane, once via `git commit` + push on the branch. Trigger the workflow. Expected:
the run goes red, your PR gets a `bit-sync-conflict` label and a comment with exact recovery
steps, and **nothing is force-pushed** — your branch tip is untouched. Resolve per the comment,
remove the label, re-trigger: the pair converges.

## Test 4 — Merge → release (~5 min)

Merge your PR (GitHub UI or `gh pr merge <n> --merge`). The `bit-release-from-source` workflow
fires automatically: your lane merges into the scope's main, new component versions release on
[bit.cloud/luvktest/test](https://bit.cloud/luvktest/test), and the lane is archived.

## Test 5 — Branch retirement

```bash
gh workflow run bit-sync-from-source.yml    # no lane input = reconcile everything
```

The merged lane's branch is deleted — the run log shows `close-pr` with the ownership evidence.
Any ordinary branch you push (never lane-synced) survives every run: deletion requires a
reconciler-authored sync commit at the tip whose committed `.bitmap` names that exact lane.

## Test 6 — Cross-scope guard

```bash
gh workflow run bit-sync-from-source.yml -f lane=luvktest.cards/cross-scope
```

That lane carries components from two scopes; one repository maps to one scope. Expected: the
run refuses loudly (red, with the component list and a docs pointer) — and enumerated runs
(Test 5) *skip* such lanes and stay green.

## Test 7 — Git-first: a plain PR becomes a lane (~10 min)

The reverse origination story. A developer who knows nothing about Bit pushes a branch and
opens a PR — the repo adopts it into a lane and the pair stays bidirectional from then on.

```bash
git checkout -b my-git-first main
# edit test/sync-probe/sync-probe.ts — any change
git commit -am "feat: born in git" && git push -u origin my-git-first
gh pr create --fill
```

The `bit-adopt-pr-from-source` workflow fires on the PR:
1. runs `bit ci pr --keep-lane` — snaps the PR's source onto lane `my-git-first` and exports it
   (branch names are sanitized: `/` becomes `-`);
2. commits the updated `.bitmap` back to the PR branch (`chore(bit-sync): anchor PR to its
   lane`). That committed `.bitmap` *is* the sync state — lane pointer + component versions —
   which is what lets `bit ci sync` treat this pair like any lane-born pair afterwards.

Verify: lane `my-git-first` on bit.cloud carries the snap; the PR branch has the anchor commit.
Then prove the marriage both ways:
- snap on the lane from any workspace (`bit lane import`, edit, `bit snap && bit export`) →
  dispatch a sync → the PR branch gains the change;
- push another commit to the PR branch → the sync exports it to the lane.

## Test 8 — Both ends at once (~10 min)

On the Test 7 pair (or any synced pair), make a lane-side snap **and** a git-side commit
touching *different* files before any sync runs, then dispatch one sync. Expected verdict:
`merge-diverged` — the engine merges lane content into the branch, snaps the merged result
back to the lane, and both ends converge to the union. Same-line edits instead **halt**:
conflict label + runbook comment, nothing force-pushed (that is Test 3).

## Reading a run

Open any `bit-sync-from-source` run → `sync` job → "Run bit-git-sync" step. The last lines are
the per-lane verdicts, e.g.:

```
my-test-x -> import-lane (pushed my-test-x @ lane f9bc68c0e)
demo-e2e  -> noop (converged)
main      -> converged (checkout head produced no changes)
```

Triggers decide *when* it runs; state decides *what* it does. Re-run anything, any time —
converged pairs are no-ops.
