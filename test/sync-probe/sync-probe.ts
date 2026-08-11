// flow-3b: a second git-side edit, made while the lane holds an unexported snap
// flow-3: the git side moved while the lane also moved

/**
 * returns 'hello world'
 */
export function syncProbe() {
  return 'hello world';
}
export const liveA = 'mode-a-live-validation';
export const devEdit = 'pushed-from-git';
export const demoE2E = 'public-demo-live-0901';
export const beat1b = 'pr-opens-hands-free';

export const RELEASED_DIRECTLY_TO_MAIN = 'this-release-never-saw-a-pull-request';

export const releasedBit = 'verified-on-bit-2.0.65';

export const gitSideEdit = 'flow-2-repo-to-cloud';

export const laneSideEdit = 'flow-3-lane-to-repo';

// adopt-demo: a git-first edit whose PR is adopted into a lane via
// `bit ci pr --keep-lane`; `bit ci sync` must then adopt the branch instead
// of halting on "branch has commits but its .bitmap records no state".
export const adoptDemoEdit = 'git-first-work-adopted-into-a-lane';

// main drift: released straight to the scope with `bit tag && bit export`;
// no git commit was made — the sync opens the bit-sync/main PR to carry it.
export const mainDrift = 'released-to-the-scope-before-git-saw-it';
