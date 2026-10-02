import * as THREE from 'three';

// Inspection views blend from the rendered pose, including interrupted transitions.
export class ViewTransition {
  constructor(duration = .7) {
    this.duration = duration;
    this.age = duration;
    this.mode = 'play';
    this.fromPosition = new THREE.Vector3();
    this.fromTarget = new THREE.Vector3();
  }
  apply(mode, dt, position, target, currentPosition, currentTarget, reducedMotion = false) {
    if (mode !== this.mode) {
      this.mode = mode;
      this.age = 0;
      this.fromPosition.copy(currentPosition);
      this.fromTarget.copy(currentTarget);
    }
    this.age = reducedMotion ? this.duration : Math.min(this.duration, this.age + dt);
    if (this.age >= this.duration) return;
    const t = this.age / this.duration, blend = t*t*(3-2*t);
    position.lerpVectors(this.fromPosition, position, blend);
    target.lerpVectors(this.fromTarget, target, blend);
  }
}
