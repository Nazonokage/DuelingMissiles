import { setTurnWind } from '../src/game/wind.js';
import { Vector3 } from 'three';
import { seededRandom } from '../src/game/simulation.js';
import { driftLauncher, driftRate } from '../src/game/missile-drift.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const validName=name=>typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(name);
export function matchConfig(input={}) {
  const countries=['italy','france','finland','uk','germany','russia','japan'];
  return {wobble:input.wobble!==false,n:input.n===7?7:5,hp:[1,2,3].includes(input.hp)?input.hp:2,
    theme:['paper','blueprint','night'].includes(input.theme)?input.theme:'blueprint',
    p1country:countries.includes(input.p1country)?input.p1country:'italy',
    p2country:countries.includes(input.p2country)?input.p2country:'france'};
}

// Only the server advances this state. Clients submit controls, never health or results.
export class Duel {
  constructor(config,seed=2026) {
    this.config=matchConfig(config);this.random=seededRandom(seed);this.turn=0;this.turnId=0;
    this.tick=0;this.sel=this.config.n>>1;this.events=[];this.eventId=0;this.nextMissile=1;
    this.wind=new Vector3();this.ball=null;this.spent=[];this.winner=null;this.held=0;this.charging=null;
    this.cannons=[0,1].map(team=>Array.from({length:this.config.n},(_,i)=>{
      const x=-45+90*i/(this.config.n-1),z=(team?-1:1)*(78-6*(1-(x/50)**2));
      return {hp:this.config.hp,cool:0,locked:false,x,z,aim:this.freshAim()};
    }));this.beginTurn();
  }
  freshAim(){return {yaw:0,pitch:.5,side:0,used:false};}
  usable(c){return c&&c.hp>0&&!c.locked;}
  live(team){return this.cannons[team].filter(c=>c.hp>0);}
  emit(type,data={}){this.events.push({id:++this.eventId,type,...data});if(this.events.length>64)this.events.shift();}
  beginTurn(){
    this.turnId++;this.held=0;this.charging=null;this.idle=0;
    const list=this.cannons[this.turn],last=this.live(this.turn).length===1;
    for(const c of list){if(last&&c.hp>0)c.cool=0;c.locked=c.cool>0;c.cool=Math.max(0,c.cool-1);c.aim.side=0;c.aim.used=false;}
    if(!this.usable(list[this.sel])){const index=list.findIndex(c=>this.usable(c));if(index>=0)this.sel=index;}
    setTurnWind(this.wind,this.random);
    this.state='moving';this.timer=1.4;
    if(!list.some(c=>this.usable(c))&&!this.spent.some(m=>m.owner===this.turn)){this.state='wait';this.timer=1.6;}
  }
  command(player,message){
    if(player!==this.turn||message.turnId!==this.turnId||this.state==='over')return false;
    const c=this.cannons[this.turn][this.sel],type=message.action;
    if(type==='cancel'){this.held=0;this.charging=null;return true;}
    if(type==='steer'&&[-1,0,1].includes(message.value)){
      if(!['aiming','flying','control'].includes(this.state))return false;
      this.held=message.value;return true;
    }
    if(type==='select'&&['moving','aiming'].includes(this.state)&&this.charging===null&&Number.isInteger(message.index)&&this.usable(this.cannons[this.turn][message.index])){this.sel=message.index;return true;}
    if(type==='charge'&&this.state==='aiming'&&this.usable(c)&&this.charging===null){this.charging=this.tick;return true;}
    if(type==='release'&&this.state==='aiming'&&this.charging!==null){
      const power=clamp((this.tick-this.charging)/180,.05,1);this.charging=null;
      const dir=this.direction(c.aim.yaw,c.aim.pitch),p=new Vector3(c.x,2.5,c.z).addScaledVector(dir,2.9);
      this.ball={id:this.nextMissile++,owner:this.turn,p,v:dir.multiplyScalar(22+power*44),ctl:false,t:0,seed:this.random()*10,side:0,used:false};
      this.ball.apexTime=this.ball.v.y/18;c.cool=this.live(this.turn).length===1?0:1;
      this.state='flying';this.emit('fire',{missileId:this.ball.id,team:this.turn,index:this.sel,p:p.toArray()});return true;
    }
    if(type==='takeover'&&this.state==='aiming'&&this.charging===null){
      const index=this.spent.findIndex(m=>m.id===message.id&&m.owner===this.turn);if(index<0)return false;
      const m=this.spent.splice(index,1)[0];m.p.y=1.4;
      this.ball={...m,v:new Vector3(),ctl:true,t:0,seed:this.random()*10,psi:0,om:0,side:0,used:false,armed:false,boost:0,boosted:false};
      this.held=0;this.state='control';this.idle=0;return true;
    }
    if(type==='go'&&this.state==='control'){
      const b=this.ball;if(!b.armed){b.armed=true;b.side=0;b.used=false;this.held=0;this.emit('recast',{missileId:b.id,team:b.owner,p:b.p.toArray()});}
      else if(!b.boosted){b.boosted=true;b.boost=.9;}else return false;
      return true;
    }
    return false;
  }
  direction(yaw,pitch=0){return new Vector3((this.turn?-1:1)*Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),(this.turn?1:-1)*Math.cos(yaw)*Math.cos(pitch));}
  input(target){
    if(!target.side&&this.held)target.side=this.held;
    if(target.side&&!this.held)target.used=true;
    return !target.used&&this.held===target.side?this.held:0;
  }
  hit(team,index,amount){const c=this.cannons[team][index];c.hp=Math.max(0,c.hp-amount);this.emit('hit',{team,index,amount});}
  blast(p){
    this.emit('blast',{p:p.toArray()});
    for(const m of this.spent.slice())if(m.p.distanceTo(p)<4)this.pop(m);
    for(const team of [0,1])this.cannons[team].forEach((c,i)=>{if(c.hp>0&&Math.hypot(c.x-p.x,c.z-p.z)<3.6)this.hit(team,i,1);});
  }
  pop(m){this.spent.splice(this.spent.indexOf(m),1);this.emit('pop',{p:m.p.toArray()});}
  finish(hit){
    const b=this.ball;this.emit('land',{missileId:b.id,ctl:b.ctl,team:b.owner,p:b.p.toArray()});
    if(b.ctl)this.blast(b.p);
    else if(!hit){b.p.y=.3;this.spent.push({id:b.id,owner:b.owner,p:b.p.clone()});this.emit('miss',{p:b.p.toArray()});}
    this.ball=null;this.held=0;this.charging=null;
    const dead=[!this.live(0).length,!this.live(1).length];
    if(dead[0]||dead[1]){this.winner=dead[0]&&dead[1]?-1:dead[0]?1:0;this.state='over';return;}
    this.state='wait';this.timer=hit||b.ctl?2:1.6;
  }
  step(dt=1/120){
    if(this.state==='over')return;this.tick++;this.idle+=dt;
    if(this.state==='moving'||this.state==='wait'){
      this.timer-=dt;if(this.timer<=0){if(this.state==='moving')this.state='aiming';else{this.turn=1-this.turn;this.beginTurn();}}return;
    }
    if((this.state==='aiming'||this.state==='control'&&!this.ball.armed)&&this.idle>90){this.ball=null;this.state='wait';this.timer=1.6;this.emit('timeout');return;}
    if(this.state==='aiming'){
      const c=this.cannons[this.turn][this.sel];if(this.usable(c))c.aim.yaw=clamp(c.aim.yaw+this.input(c.aim)*.7*dt,-.6,.6);
      return;
    }
    const b=this.ball;if(!b)return;
    if(b.ctl){
      if(!b.armed){b.psi=clamp(b.psi+this.input(b)*1.6*dt,-1.2,1.2);return;}
      b.t+=dt;const boost=b.boost>0;if(boost)b.boost-=dt;
      b.om+=((boost?0:this.input(b)*1.8)-b.om)*(1-Math.exp(-dt*3));
      b.psi+=boost?0:(b.om+(this.config.wobble?driftRate(b.t,b.seed):0))*dt;
      const e=Math.min(b.t/1.6,1),speed=5+17*e*e*(3-2*e);
      b.v.copy(this.direction(b.psi+(this.config.wobble&&!boost?Math.sin(b.t*6+b.seed)*.06:0))).multiplyScalar(boost?Math.max(speed,16)*1.8:speed);
      b.p.addScaledVector(b.v,dt).addScaledVector(this.wind,(b.t-dt/2)*dt);
      if(b.t>.5){
        const hit=this.cannons.flat().some(c=>c.hp>0&&Math.hypot(c.x-b.p.x,c.z-b.p.z)<1.9);
        const missile=this.spent.find(m=>m.p.distanceTo(b.p)<2);if(missile)this.pop(missile);
        if(hit||missile){this.finish(true);return;}
      }
      if(b.t>5.5||Math.abs(b.p.x)>108||Math.abs(b.p.z)>118)this.finish(false);
      return;
    }
    for(let k=0;k<2&&this.ball;k++){
      const h=dt/2;if(this.config.wobble)driftLauncher(b.v,b.t,h,b.seed,b.apexTime);b.t+=h;b.v.y-=18*h;b.v.x+=this.wind.x*h;b.v.z+=this.wind.z*h;
      const angle=this.input(b)*.55*h,x=b.v.x;b.v.x=x*Math.cos(angle)-b.v.z*Math.sin(angle);b.v.z=b.v.z*Math.cos(angle)+x*Math.sin(angle);
      b.p.addScaledVector(b.v,h).addScaledVector(this.wind,-.5*h*h);b.p.y+=.5*18*h*h;
      const enemy=1-this.turn,index=this.cannons[enemy].findIndex(c=>c.hp>0&&b.p.distanceTo(new Vector3(c.x,2.6,c.z))<1.9);
      if(index>=0){this.hit(enemy,index,2);this.finish(true);break;}
      const missile=this.spent.find(m=>m.p.distanceTo(b.p)<2);
      if(missile){this.pop(missile);this.blast(b.p);this.finish(true);break;}
      if(b.p.y<=.3||Math.abs(b.p.z)>118||Math.abs(b.p.x)>108){this.finish(false);break;}
    }
  }
  serialize(){
    const missile=m=>m?{...m,p:m.p.toArray(),v:m.v?.toArray()}:null;
    return {...this,random:undefined,randomState:this.random.getState(),wind:this.wind.toArray(),ball:missile(this.ball),spent:this.spent.map(missile)};
  }
  static restore(data){
    const g=Object.assign(Object.create(Duel.prototype),data);
    const missile=m=>m?{...m,p:new Vector3().fromArray(m.p),...(m.v?{v:new Vector3().fromArray(m.v)}:{})}:null;
    g.random=seededRandom(data.randomState);g.wind=new Vector3().fromArray(data.wind);g.ball=missile(data.ball);g.spent=data.spent.map(missile);
    delete g.randomState;return g;
  }
  snapshot(){
    const missile=m=>m?{...m,p:m.p.toArray(),v:m.v?.toArray()}:null;
    return {tick:this.tick,turn:this.turn,turnId:this.turnId,sel:this.sel,state:this.state,wind:this.wind.toArray(),
      cannons:this.cannons,ball:missile(this.ball),spent:this.spent.map(missile),events:this.events,winner:this.winner,
      power:this.charging===null?0:clamp((this.tick-this.charging)/180,0,1),remaining:Math.max(0,Math.ceil(90-this.idle))};
  }
}
