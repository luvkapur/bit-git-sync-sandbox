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

// feature-banner: a cloud-first change — snapped on a lane, synced to a git
// branch and PR by `bit ci sync` with no manual git work at all.
export const featureBanner = 'banner-text-chosen-in-git';

// feature-banner, git side: an ordinary commit pushed to the branch;
// the sync exports it back onto the lane as a snap.
export const bannerCopy = 'git-edit-flows-back-to-the-lane';

// diverged, lane side: snapped on the lane while the branch moved too.
export const divergedLaneSide = 'lane-moved-while-git-moved';
