export const CAMERA_DEFAULTS = Object.freeze({yaw:0,pitch:.38,distance:40,manual:false});
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
export function createCameraControls(surface, rig, enabled, height, options = {}) {
  const defaults=options.defaults||CAMERA_DEFAULTS;
  const [minDistance,maxDistance]=options.distance||[40,120];
  const [minPitch,maxPitch]=options.pitch||[.08,1.1];
  const pointers = new Map();
  const distance = () => { const [a,b] = [...pointers.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  const clear = () => {
    const ids = [...pointers.keys()]; pointers.clear();
    for (const id of ids) if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  };
  const reset = () => { clear(); Object.assign(rig,defaults); };
  const handlers = {
    pointerdown(e) {
      if (!enabled() || e.clientY > height()*.72 || e.button !== 0 || pointers.size >= 2) return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); surface.setPointerCapture(e.pointerId);
    },
    pointermove(e) {
      if (!enabled()) return clear();
      const p = pointers.get(e.pointerId); if (!p) return;
      const previous = pointers.size === 2 ? distance() : 0;
      const dx = e.clientX-p.x, dy = e.clientY-p.y;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if (pointers.size === 2) { const next = distance(); if (next>0&&previous>0) rig.distance=clamp(rig.distance*previous/next,minDistance,maxDistance); }
      else { rig.yaw=clamp(rig.yaw-dx*.008,-Math.PI,Math.PI); rig.pitch=clamp(rig.pitch+dy*.006,minPitch,maxPitch); }
      rig.manual=true;
    },
    pointerup(e) { pointers.delete(e.pointerId); if(surface.hasPointerCapture(e.pointerId)) surface.releasePointerCapture(e.pointerId); },
    pointercancel(e) { handlers.pointerup(e); },
    lostpointercapture(e) { pointers.delete(e.pointerId); },
    wheel(e) { if(!enabled()) return; e.preventDefault(); rig.distance=clamp(rig.distance+e.deltaY*.015,minDistance,maxDistance); rig.manual=true; }
  };
  for(const [event,handler] of Object.entries(handlers)) surface.addEventListener(event,handler,{passive:false});
  return { clear, reset, update(){if(!enabled())clear()}, dispose(){clear();for(const [event,handler] of Object.entries(handlers))surface.removeEventListener(event,handler)} };
}
