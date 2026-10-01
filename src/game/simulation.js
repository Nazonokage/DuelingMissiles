export function seededRandom(seed){let value=seed>>>0;return()=>{value=(value+0x6D2B79F5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
export class FixedStepper {
  constructor(step=1/120){this.step=step;this.accumulator=0;this.ticks=0}
  advance(elapsed,update){this.accumulator+=Math.max(0,Math.min(elapsed,.25));while(this.accumulator+1e-10>=this.step){update(this.step);this.accumulator-=this.step;this.ticks++}}
  reset(){this.accumulator=0}
}
