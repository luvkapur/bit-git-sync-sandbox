# bit-git-sync — live end-to-end demo

This repository demonstrates bi-directional sync between [Bit lanes](https://bit.cloud/luvktest/test) and GitHub branches/PRs, powered by the `bit ci sync` command ([teambit/bit#10541](https://github.com/teambit/bit/pull/10541)) built **from source** on every run.

## The wiring (zero middleware)

```
bit export (lane)  →  bit.cloud webhook (custom template + Authorization header)
                   →  GitHub repository_dispatch  →  Actions workflow
                   →  bit ci sync (dev binary, built from source on the runner)
                   →  branch + PR appear / lane advances / branches retire
```

- `.github/workflows/bit-sync-from-source.yml` — the sync job (webhook/manual triggered)
- `.github/workflows/bit-release-from-source.yml` — the release job (PR merge → `bit ci merge`)
- The bit.cloud org webhook posts `{"event_type":"bit-export","client_payload":{"laneId":…}}` straight to GitHub's dispatch API.

## Demo beats

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
