// Smooth, seeded wobble: no instantaneous random direction changes per frame.
export function driftRate(time, seed, delay = .8, strength = .4) {
  const ramp = Math.min(2.5, Math.max(0, time - delay));
  return (Math.sin(time * 9 + seed) + Math.sin(time * 5.3 + seed * 2)) * strength * ramp;
}
export function driftLauncher(velocity, time, dt, seed, apexTime) {
  // Only the descending portion of a step contributes, even when it crosses the apex.
  const start = Math.max(time, apexTime);
  const activeDt = Math.max(0, time + dt - start);
  if (activeDt === 0) return;
  const sinceApex = start - apexTime + activeDt / 2;
  const angle = driftRate(sinceApex, seed, 0, .28) * activeDt;
  const c = Math.cos(angle), s = Math.sin(angle), x = velocity.x;
  velocity.x = x * c + velocity.z * s;
  velocity.z = velocity.z * c - x * s;
}
