# bit-git-sync — live end-to-end demo

**One setup: a git repository mapped to a Bit scope, configured with the bit-git-sync GitHub
Action** (running a from-source build of `bit ci sync`, [teambit/bit#10541](https://github.com/teambit/bit/pull/10541)).

**Three guarantees, each demonstrated live in this repo:**

## Guarantee 1 — Cloud → repo
*Any change to the scope via bit.cloud creates a branch + PR here and keeps it in sync.*

A developer works on a lane from **any workspace, anywhere** — they never clone or reference
this repository (a lane is an ephemeral repo). The moment they `bit export`, the webhook fires
and this repo grows a branch + PR with the real source.

- Proof: [PR #7](../../pull/7) — full lifecycle to merge + release; lane `ephemeral-proof` —
  created in a scratch directory that never saw this repo, PR appeared hands-free.

## Guarantee 2 — Repo → cloud
*Any change introduced here (an ordinary git PR) creates a lane and keeps it in sync.*

A git developer — who may know nothing about Bit — pushes a branch and opens a PR. The adopt
workflow marries it to a lane (`bit ci pr`), anchors the pair by committing `.bitmap` (the
committed `.bitmap` IS the sync state — lane pointer + component versions), and from then on
the standard sync keeps the pair converged.

- Proof: [PR #9](../../pull/9) — born as a plain git PR, married to lane `git-first-demo`.

## Guarantee 3 — Both ends at once
*A change worked on from both ends simultaneously stays in sync.*

On one pair: a snap lands on the lane (from some other workspace) while a commit lands on the
branch. The next sync classifies the divergence, merges lane content into the branch's working
tree, snaps the merged result back to the lane, and records the new state — both ends converge
to the union. If the two ends touched the same lines, the engine **halts instead**: conflict
label + runbook comment, nothing force-pushed, resume by removing the label.

- Proof: see the "both ends" commits on the Guarantee-2 pair below, and Test 3 in
  [TESTING.md](./TESTING.md) for the conflict variant.

---

## The playbook (beats behind the guarantees)

1. **Lane → PR (hands-free).** A developer exports a lane on bit.cloud. The webhook fires, the workflow runs, and a branch + pull request appear with the lane's real source. No human between `bit export` and the PR.
2. **PR branch → lane.** A developer pushes an ordinary git commit to the PR branch. The next sync run snaps it onto the lane on bit.cloud — the runner performs a real `bit snap` + export.
3. **Conflict safety.** If the lane and branch edit the same lines, the run halts: the PR gets a `bit-sync-conflict` label + a runbook comment. Removing the label resumes syncing. Nothing is force-pushed, ever.
4. **Merge → release.** Merging the PR triggers the release workflow: the lane merges into the scope's main and new component versions release on bit.cloud.
5. **Retirement.** The next `--all` run retires the merged lane's branch — deletion requires proof (the branch tip must be a reconciler-authored sync commit whose committed `.bitmap` names that exact lane). Ordinary developer branches are never touched.
6. **Cross-scope guard.** A lane carrying components from multiple scopes is skipped with a clear reason (one repo maps one scope) — enumerated runs stay green.

## Artifacts from live runs

- **The showcase**: [PR #7 (demo-e2e)](../../pull/7) — opened hands-free by `github-actions` after a `bit export`, zero humans in the chain.
- Main-scope sync PR: [#8 (bit-sync/main)](../../pull/8) — drift detected and proposed as a reviewable PR.
- Full lifecycle PR: [#1 (live-a)](../../pull/1) — sync commits, dev commit, conflict label + runbook, resolution, merge.
- Retirement in action: [PR #6](../../pull/6) — the engine's hardening battlefield, closed by the ownership rule after its lane was removed.
- First hands-free dispatch: [run 30555608626](../../actions/runs/30555608626) · first green runner-side snap: [run 30630594375](../../actions/runs/30630594375)

## Setup note learned live

Repository setting **Actions → General → "Allow GitHub Actions to create and approve pull requests"** must be enabled — without it the sync degrades gracefully (branch pushed, warning logged, run stays green) but no PR appears.
