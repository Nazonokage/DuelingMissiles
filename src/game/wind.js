// Horizontal acceleration in world units/s². A three-second shot drifts
// 2.7–8.1 units, enough to matter against a roughly two-unit-wide launcher.
export const WIND_MIN = .6;
export const WIND_MAX = 1.8;

export function setTurnWind(vector, random) {
  const angle = random() * Math.PI * 2;
  const strength = WIND_MIN + random() * (WIND_MAX - WIND_MIN);
  return vector.set(Math.sin(angle) * strength, 0, Math.cos(angle) * strength);
}

export function windLevel(strength) {
  return strength < .1 ? 'Calm' : strength < .9 ? 'Light' : strength < 1.4 ? 'Moderate' : 'Strong';
}
