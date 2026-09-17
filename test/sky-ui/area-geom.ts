import { EARTH_RADIUS_KM, MAX_RADIUS_KM } from '@luvktest/test.watch-area';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * A spherical cap, expressed in the camera's own frame.
 *
 * The globe's draw loop already works in a rotated frame: for a point at
 * (lat, lon) it holds `sin/cos(lat)` and `sin/cos(lon − lon0)`, and those four
 * numbers **are** the point's unit vector in the frame whose first axis points
 * along the camera's meridian — `(cosφ·cosΔλ, cosφ·sinΔλ, sinφ)`. So a cap
 * membership test in that frame is one dot product against `cosθ`, with no
 * trigonometry per aircraft at all.
 *
 * That matters: `WatchArea.contains` is a haversine, which is five
 * transcendentals, and running it over nine thousand aircraft every frame would
 * cost more than drawing them. It is the same predicate — `distance ≤ radius`
 * and `cos(angle) ≥ cos(θ)` are the same inequality on a sphere — and it is
 * correct at the antimeridian and at the poles for the same reason the entity
 * is: there is no longitude branch anywhere in it.
 *
 * `WatchArea` stays the authority for everything that is not per-frame: what a
 * user is told, what is sent to the server, what "42 km outside" means.
 */
export type CapCam = {
  /** the centre's unit vector in the camera frame */
  A: number; B: number; C: number;
  /** angular radius */
  theta: number;
  cosR: number;
  sinR: number;
};

/** Project a cap centre into the camera frame. A handful of trig calls, once per area per frame. */
export function capInCam(lat: number, lon: number, radiusKm: number, lon0: number): CapCam {
  const la = lat * DEG;
  const dl = (lon - lon0) * DEG;
  const cla = Math.cos(la);
  const theta = Math.min(radiusKm, MAX_RADIUS_KM) / EARTH_RADIUS_KM;
  return {
    A: cla * Math.cos(dl),
    B: cla * Math.sin(dl),
    C: Math.sin(la),
    theta,
    cosR: Math.cos(theta),
    sinR: Math.sin(theta),
  };
}

/**
 * Is this aircraft inside the cap?
 *
 * Takes the four numbers the aircraft loop has already computed. No allocation,
 * no trigonometry, three multiplies.
 */
export function capHolds(cap: CapCam, sla: number, cla: number, sdl: number, cdl: number): boolean {
  return cap.A * cla * cdl + cap.B * cla * sdl + cap.C * sla >= cap.cosR;
}

/** Great-circle distance between two lat/lon points, in km. Haversine, clamped. */
export function arcKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/** Screen position of a camera-frame unit vector, using the globe's own projection. */
function place(A: number, B: number, C: number, sp: number, cp: number, R: number, cx: number, cy: number) {
  return { x: cx + R * B, y: cy - R * (cp * C - sp * A), front: cp * A + sp * C > 0 };
}

/** Where the cap's centre lands on screen, or null if it is round the back. */
export function capCentreOnScreen(cap: CapCam, sp: number, cp: number, R: number, cx: number, cy: number) {
  const p = place(cap.A, cap.B, cap.C, sp, cp, R, cx, cy);
  return p.front ? p : null;
}

/**
 * An orthonormal pair perpendicular to a cap's centre, in the camera frame.
 *
 * Crossed with whichever axis the centre leans on least, so `u` is never near
 * zero length. Split out of `traceCap` because the grab handles need the same
 * parametrisation the ring is walked with — a handle that is not exactly on the
 * ring is a handle that lies about what it will do.
 */
function capBasis(cap: CapCam) {
  const { A, B, C } = cap;
  const ax = Math.abs(A), ay = Math.abs(B), az = Math.abs(C);
  let ux: number, uy: number, uz: number;
  if (ax <= ay && ax <= az) { ux = 0; uy = -C; uz = B; }
  else if (ay <= az) { ux = C; uy = 0; uz = -A; }
  else { ux = -B; uy = A; uz = 0; }
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul; uy /= ul; uz /= ul;
  return { ux, uy, uz, vx: B * uz - C * uy, vy: C * ux - A * uz, vz: A * uy - B * ux };
}

/**
 * The four grab handles of a cap, as screen points, front-facing ones only.
 *
 * Phased from the boundary point that lands furthest to the right on screen, so
 * the handles sit at the compass points of the ring *as drawn* rather than at
 * an arbitrary rotation that slides as the globe turns. A cap half round the
 * back yields fewer than four; a cap entirely round the back yields none, and
 * the caller simply draws no handles.
 */
export function capHandlesOnScreen(cap: CapCam, sp: number, cp: number, R: number, cx: number, cy: number) {
  const { A, B, C, cosR, sinR } = cap;
  const b = capBasis(cap);
  // screen x of a boundary point is cx + R·(B·cosR + uy·cosφ·sinR + vy·sinφ·sinR),
  // which is maximal at φ = atan2(vy, uy).
  const phi0 = Math.atan2(b.vy, b.uy);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const phi = phi0 + (i * Math.PI) / 2;
    const cf = Math.cos(phi) * sinR, sf = Math.sin(phi) * sinR;
    const p = place(
      A * cosR + b.ux * cf + b.vx * sf,
      B * cosR + b.uy * cf + b.vy * sf,
      C * cosR + b.uz * cf + b.vz * sf,
      sp, cp, R, cx, cy
    );
    if (p.front) out.push({ x: p.x, y: p.y });
  }
  return out;
}

/**
 * Carry `p` along the rotation that takes `from` to `to`.
 *
 * This is what makes dragging a drawn area feel like dragging an object rather
 * than re-aiming one: the piece of the world the pointer went down on stays
 * under the pointer, and the circle's centre is rotated by the same amount
 * rather than teleported to wherever the cursor is. Rodrigues about the axis
 * `from × to`, so it is correct across the date line and over a pole — there is
 * no longitude arithmetic in it at all.
 */
export function dragOnSphere(
  p: { lat: number; lon: number },
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): { lat: number; lon: number } {
  const a = unit(from), b = unit(to), c = unit(p);
  const kx = a[1] * b[2] - a[2] * b[1];
  const ky = a[2] * b[0] - a[0] * b[2];
  const kz = a[0] * b[1] - a[1] * b[0];
  const s = Math.hypot(kx, ky, kz);
  if (s < 1e-12) return { lat: p.lat, lon: p.lon };          // no rotation to make
  const ang = Math.atan2(s, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const ux = kx / s, uy = ky / s, uz = kz / s;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const kd = ux * c[0] + uy * c[1] + uz * c[2];
  const x = c[0] * ca + (uy * c[2] - uz * c[1]) * sa + ux * kd * (1 - ca);
  const y = c[1] * ca + (uz * c[0] - ux * c[2]) * sa + uy * kd * (1 - ca);
  const z = c[2] * ca + (ux * c[1] - uy * c[0]) * sa + uz * kd * (1 - ca);
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, z))) / DEG,
    lon: Math.atan2(y, x) / DEG,
  };
}

function unit(g: { lat: number; lon: number }): [number, number, number] {
  const la = g.lat * DEG, lo = g.lon * DEG, cla = Math.cos(la);
  return [cla * Math.cos(lo), cla * Math.sin(lo), Math.sin(la)];
}

/** Scratch space, reused every frame so a ring costs no allocation. */
const RING = new Float64Array(3 * 256);

/**
 * Walk a cap's boundary into the current path.
 *
 * The boundary is `c·cosθ + (u·cosφ + v·sinφ)·sinθ` for an orthonormal pair
 * `u, v` perpendicular to the centre — a circle on the sphere, not an ellipse
 * fitted to one, so it is still right when the cap straddles the date line or
 * swallows a pole. Points behind the globe are dropped, which clips the ring at
 * the limb for free.
 *
 * Returns true when every point was in front, i.e. the ring is a closed shape
 * on screen and may be filled.
 */
export function traceCap(
  ctx: CanvasRenderingContext2D, cap: CapCam,
  sp: number, cp: number, R: number, cx: number, cy: number,
  steps = 128
): boolean {
  const n = Math.max(24, Math.min(255, steps));
  const { A, B, C, cosR, sinR } = cap;
  const { ux, uy, uz, vx, vy, vz } = capBasis(cap);

  let all = true;
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * TAU;
    const cf = Math.cos(phi) * sinR, sf = Math.sin(phi) * sinR;
    const px = A * cosR + ux * cf + vx * sf;
    const py = B * cosR + uy * cf + vy * sf;
    const pz = C * cosR + uz * cf + vz * sf;
    const p = place(px, py, pz, sp, cp, R, cx, cy);
    RING[i * 3] = p.x; RING[i * 3 + 1] = p.y; RING[i * 3 + 2] = p.front ? 1 : 0;
    if (!p.front) all = false;
  }

  if (all) {
    ctx.moveTo(RING[0], RING[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(RING[i * 3], RING[i * 3 + 1]);
    ctx.closePath();
    return true;
  }

  let on = false;
  for (let i = 0; i <= n; i++) {
    const k = (i % n) * 3;
    if (!RING[k + 2]) { on = false; continue; }
    if (on) ctx.lineTo(RING[k], RING[k + 1]);
    else { ctx.moveTo(RING[k], RING[k + 1]); on = true; }
  }
  return false;
}

export { EARTH_RADIUS_KM, MAX_RADIUS_KM };
