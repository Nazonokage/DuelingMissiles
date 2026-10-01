// Track each physical key or pointer independently, including mixed input.
export function createHeldInput(state, fireDown, fireUp, cancelFire) {
  const sources = new Map();
  function press(action, source) {
    const held = sources.get(action) || new Set();
    if (held.has(source)) return;
    sources.set(action, held);
    held.add(source);
    if (action === 'fire') { if (held.size === 1) fireDown(); }
    else state[action] = 1;
  }
  function release(action, source, cancelled = false) {
    const held = sources.get(action);
    if (!held?.delete(source) || held.size) return;
    sources.delete(action);
    if (action === 'fire') { if (cancelled) cancelFire(); else fireUp(); }
    else state[action] = 0;
  }
  function clear() {
    sources.clear();
    for (const action of Object.keys(state)) state[action] = 0;
    cancelFire();
  }
  return { press, release, clear };
}

export function bindHoldButton(button, action, input) {
  button.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    input.press(action, `pointer:${e.pointerId}`);
  });
  const finish = (e, cancelled) => {
    input.release(action, `pointer:${e.pointerId}`, cancelled);
    if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId);
  };
  button.addEventListener('pointerup', e => finish(e, false));
  button.addEventListener('pointercancel', e => finish(e, true));
  button.addEventListener('lostpointercapture', e => input.release(action, `pointer:${e.pointerId}`, true));
}
