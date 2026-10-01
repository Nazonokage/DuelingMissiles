import * as THREE from 'three';
const smooth = x => x*x*(3-2*x);
export class ImpactCamera {
  constructor() {
    this.duration = 3.0;
    this.hold = 2.0;
    this.age = this.duration;
    this.target = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.returnPosition = new THREE.Vector3();
    this.returnTarget = new THREE.Vector3();
    this.arrival = .25;
    this.fromPosition = new THREE.Vector3();
    this.fromTarget = new THREE.Vector3();
  }
  get active() { return this.age < this.duration; }
  get timeScale() {
    if (!this.active) return 1;
    const recovery = Math.max(0, (this.age-this.hold)/(this.duration-this.hold));
    return .12 + .88*smooth(recovery);
  }
  trigger(point, camera, look, side, enabled = true, reducedMotion = false) {
    // Every new blast renews slow motion and focuses its own explosion.
    if (!enabled) return false;
    this.reducedMotion = reducedMotion;
    this.target.copy(point);
    this.fromPosition.copy(camera.position);
    this.fromTarget.copy(look);
    this.fov = camera.fov;
    // Continue from the follow camera's approach direction, then park nearby.
    const distance = 6.5*(camera.aspect < .9 ? 1.3 : 1);
    let dx = camera.position.x-point.x, dz = camera.position.z-point.z;
    const length = Math.hypot(dx,dz);
    if (length < .001) { dx = 0; dz = point.z >= 0 ? -1 : 1; }
    else { dx /= length; dz /= length; }
    this.position.set(point.x+dx*distance,Math.max(3.5,point.y+distance*.38),point.z+dz*distance);
    this.age = 0;
    return true;
  }
  apply(dt, position, target, enabled = true) {
    if (!enabled) { this.age = this.duration; return; }
    if (!this.active) return;
    this.age = Math.min(this.duration, this.age+dt);
    this.returnPosition.copy(position);
    this.returnTarget.copy(target);
    const settle = this.reducedMotion ? 1 : smooth(Math.min(1,this.age/this.arrival));
    position.copy(this.fromPosition).lerp(this.position,settle);
    target.copy(this.fromTarget).lerp(this.target,settle);
    if (this.age > this.hold && (!this.reducedMotion || !this.active)) {
      const blend = this.reducedMotion ? 1 : smooth((this.age-this.hold)/(this.duration-this.hold));
      position.lerp(this.returnPosition,blend);
      target.lerp(this.returnTarget,blend);
    }
  }
}
