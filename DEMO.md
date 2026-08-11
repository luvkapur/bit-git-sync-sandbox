# bit-git-sync — live end-to-end demo

One setup: this git repository is mapped to the Bit scope `luvktest.test` and configured with
the bit-git-sync GitHub Action (`bit ci sync`). Everything below happened live in this repo —
every claim links to the real Actions run that proved it.

The engine is a **stateless reconciler**: the committed `.bitmap` on each branch IS the sync
state (which lane the branch mirrors + the exact version of every component). Triggers — the
bit.cloud webhook, branch pushes, an hourly cron — only decide *when* it runs, never *what* it
does. Converged state is a no-op; the command is safe to re-run at any time.

---

## Flow 1 — Lane → branch (cloud-first work lands as a PR)

A developer works on a lane from any workspace, anywhere — they never clone this repository.
The moment they `bit export`, the webhook fires and this repo grows a branch + PR with the
lane's real source.

**What we did:** `bit lane create feature-banner`, edited `sync-probe`, `bit snap && bit export`.
**What the automation did:** [run 31517811196](../../actions/runs/31517811196) planned
`feature-banner -> import-lane (branch: feature-banner, lane head: 8b3c75493, branch state: none)`,
pushed the branch, and opened [PR #19](../../pull/19) hands-free.
**What you see:** a PR whose committed `.bitmap` records the lane pointer
(`_bit_lane: luvktest.test/feature-banner`) and the exact snap of every component — the anchor
every later decision reads.

## Flow 2 — Branch → lane (a plain git commit flows to the cloud)

A git developer — who may know nothing about Bit — pushes an ordinary commit to the PR branch.

**What we did:** edited `sync-probe.ts`, `git commit && git push` — nothing else.
**What the automation did:** [run 31518125726](../../actions/runs/31518125726) planned
`feature-banner -> export-branch (dev commits: true)`, performed a real `bit snap` + export on
the runner, and pushed the ledger commit `chore(bit-sync): sync lane … @ 36fb47b8f` back to the
branch.
**What you see:** the lane on bit.cloud now carries the git edit; a fresh
`bit lane import luvktest.test/feature-banner` in any workspace shows the change.

## Both ends at once — merge-diverged

A snap landed on the lane while a different-file commit landed on the branch, before any sync
could run (the export webhook and the git push fired within the same second).

- [Run 31518467871](../../actions/runs/31518467871):
  `feature-banner -> merge-diverged (lane head: 6ac486c25, branch state: 36fb47b8f, dev commits: true)`
  → merged the lane into the branch tree with no conflicts, snapped the merged result, exported,
  pushed. Both edits now live on both ends.
- Its twin [run 31518467856](../../actions/runs/31518467856) raced it, lost the push, detected
  the concurrent CI export, rebased onto the remote lane and reported
  `raced (… next run re-plans)` — no work lost, no red run.
- [Run 31518588740](../../actions/runs/31518588740) fast-forwarded the branch;
  [run 31518598765](../../actions/runs/31518598765) confirmed `noop (converged)`.

## Same-line conflict — halt, label, resume

Both ends rewrote the *same line*. Merging would erase someone's work, so the sync **halts**
instead of guessing.

- [Run 31519023931](../../actions/runs/31519023931) went red on purpose:
  `HALTED feature-banner -> merge conflicts in: luvktest.test/sync-probe`, put the
  `bit-sync-conflict` label on [PR #19](../../pull/19) and posted a runbook comment with the
  exact local commands to resolve. Nothing was force-pushed to either end.
- The simultaneous push-triggered [run 31519024882](../../actions/runs/31519024882) saw the
  label and latched: `noop (PR is labeled bit-sync-conflict; resolve and remove the label to resume)` —
  the label is a lock that stops every trigger from retrying a known-bad merge.
- A human picked the winning text, pushed the resolution, removed the label; the pair then
  reconverged — [run 31519727103](../../actions/runs/31519727103) brought the branch and lane
  back to the same head (`import-lane … @ lane ea27e6c0f`).

## Retirement — the lane is deleted on bit.cloud

bit.cloud sends no "lane removed" event, so the hourly reconcile (or a manual dispatch) is what
notices. Deletion requires proof of ownership: the branch tip must be the reconciler's **own
ledger commit** with no human commits above it.

- [Run 31519982407](../../actions/runs/31519982407):
  `feature-banner -> close-pr (lane head: none, dev commits: false, branch claim: own-live)`
  → closed [PR #19](../../pull/19) and deleted the branch. A branch with unmerged human work
  above its sync state is always kept — a false "human" only ever keeps a branch.

## Flow 3 — Merge → release

Merging the lane PR releases the work: the lane merges into the scope's main and new component
versions publish on bit.cloud.

**What we did:** merged [PR #16](../../pull/16) (the adopted `adopt-demo` branch).
**What the automation did:** [run 31517352093](../../actions/runs/31517352093) ran
`bit ci merge`: tagged `luvktest.test/sync-probe@0.0.6`, exported it to main, and archived lane
`luvktest.test/adopt-demo`.
**Then the reconciler retired the branch:** [run 31517526996](../../actions/runs/31517526996)
planned `adopt-demo -> close-pr (… dev commits: false, branch claim: own-merged)` and deleted
the branch — its entire history was reachable from main, so nothing could be lost.

## Flow 4 — Main drift → git (a release that never saw a PR)

A `bit tag && bit export` straight to the scope's main, with **no git commit at all**.

**What the automation did:** the hourly cron [run 31520188260](../../actions/runs/31520188260)
reported `main -> drift in 2 file(s): .bitmap, test/sync-probe/sync-probe.ts`, pushed the drift
onto `bit-sync/main` and opened [PR #20](../../pull/20) for review (conflicts, had there been
any, resolve in favour of the scope — the PR body says so and invites closing instead of
merging).
**What we did:** merged it. [Run 31520533700](../../actions/runs/31520533700) then confirmed
`main -> converged (checkout head produced no changes)`.

## The adoption story — a git-first PR marries a lane

The one scenario that used to be fatal: a PR branch adopted onto a lane with
`bit ci pr --keep-lane`, whose committed `.bitmap` still carries **main's** state (no lane
pointer). The lane exists, the branch has real commits, and the reconciler must not guess.

- **Before the fix:** [run 31513767094](../../actions/runs/31513767094) — released bit HALTED:
  `branch adopt-demo has commits but its .bitmap records no state for lane …` — a red run and a
  stuck pair, even though nothing was actually wrong.
- **After the fix:** [run 31516683588](../../actions/runs/31516683588) — the same state plans
  `adopt-branch`: the reconciler proves via `bit status` that the branch tree is already the
  lane's content, writes the missing lane pointer into `.bitmap`, and pushes one audit-trailed
  ledger commit (`Bit-Adopted: true`). From then on the pair syncs like any other — all the way
  through the Flow-3 merge + release above.

## Dry-run

`bit ci sync --all --dry-run` prints the planned action per target and writes nothing: remote
refs were byte-identical before and after, and the working tree is restored (a dirty tree is
refused rather than discarded).

---

## Current end state

- Branches: `main` and `bit-sync/main` (the standing main-drift proposal branch, reused per
  drift). No open PRs.
- Scope `luvktest.test`: `sync-probe@0.0.7`, `notifications/toast@0.0.2` — converged with git
  main. Lane list: empty (`adopt-demo` archived on release, `feature-banner` retired).

## Setup notes learned live

- Repository setting **Actions → General → "Allow GitHub Actions to create and approve pull
  requests"** must be enabled — without it the sync degrades gracefully (branch pushed, warning
  logged, run stays green) but no PR appears.
- The bit.cloud webhook fires `repository_dispatch: bit-export` on every export;
  `client_payload.laneId` carries the lane (empty = main export). Lane *removal* sends no
  event — the hourly cron is what finds it.
