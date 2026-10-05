import * as THREE from 'three';

// Recorded positions, rather than predicted arcs. Keep a bounded history per match.
export class TrajectoryHistory {
  constructor(limit=200) {
    this.limit=limit;
    this.paths=[];
    this.group=new THREE.Group();
    this.group.visible=false;
  }
  begin(owner,color,position) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(2048*3),3));
    geometry.setDrawRange(0,0);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:new THREE.Color(color).lerp(new THREE.Color(0xffffff),.35),transparent:true,opacity:.9,depthTest:false,fog:false}));
    line.renderOrder=11;line.frustumCulled=false;
    const path={owner,line,count:0,last:null};
    this.paths.push(path);this.group.add(line);this.add(path,position,true);
    if(this.paths.length>this.limit){const old=this.paths.shift();this.group.remove(old.line);old.line.geometry.dispose();old.line.material.dispose();}
    return path;
  }
  add(path,position,force=false) {
    if(!path||path.count>=2048||!this.paths.includes(path))return;
    if(path.last&&path.last.distanceToSquared(position)<(force?1e-8:.25))return;
    path.last=position.clone();
    const attribute=path.line.geometry.attributes.position;
    attribute.setXYZ(path.count++,position.x,Math.max(.5,position.y),position.z);
    attribute.needsUpdate=true;path.line.geometry.setDrawRange(0,path.count);
  }
  show(visible,owner=-1) {
    this.group.visible=visible;
    for(const path of this.paths)path.line.visible=owner<0||path.owner===owner;
  }
}
