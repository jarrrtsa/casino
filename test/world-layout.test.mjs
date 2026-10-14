import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_LAYOUTS, WORLD_GEOMETRY, FOOT_RADIUS, DEFAULT_POSITION, isWalkable, safePosition, moveFootpoint, interactionAt } from '../public/world-layout.mjs';
import { WORLD, initialPosition, movePosition } from '../public/home-world.mjs';

const b = WORLD_GEOMETRY.bounds;

test('world layouts preserve geometry and provide immutable conservative feet footprints', () => {
  assert.equal(WORLD.width,3840);assert.equal(WORLD.height,1080);assert.deepEqual(WORLD.bounds,{left:384,right:3456,top:648,bottom:972});
  for(const [environment,layout] of Object.entries(WORLD_LAYOUTS)){
    assert.equal(isWalkable(initialPosition(),environment),true);
    assert.deepEqual(layout.interactions.map(area=>area.target),['poker','computer']);
    assert.equal(Object.isFrozen(layout),true);assert.equal(Object.isFrozen(layout.obstacles),true);
    for(const obstacle of layout.obstacles){assert.equal(Object.isFrozen(obstacle),true);assert.ok(obstacle.width>0&&obstacle.height>0);}
  }
});

test('swept feet stop on each obstacle face, slide along it and allow stepping away', () => {
  for(const [environment,layout] of Object.entries(WORLD_LAYOUTS)) for(const wall of layout.obstacles){
    const left=wall.x-FOOT_RADIUS,right=wall.x+wall.width+FOOT_RADIUS,top=wall.y-FOOT_RADIUS,bottom=wall.y+wall.height+FOOT_RADIUS;
    const cases=[
      [{x:left-2,y:(top+bottom)/2},10000,0,'x',left],
      [{x:right+2,y:(top+bottom)/2},-10000,0,'x',right],
      [{x:(left+right)/2,y:top-2},0,10000,'y',top],
      [{x:(left+right)/2,y:bottom+2},0,-10000,'y',bottom]
    ];
    for(const [start,dx,dy,axis,face]of cases){
      if(!isWalkable(start,environment))continue;
      const result=moveFootpoint(start,dx,dy,environment);assert.equal(isWalkable(result,environment),true);
      if(dx>0||dy>0)assert.ok(result[axis]<=face);else assert.ok(result[axis]>=face);
    }
  }
  const wall=WORLD_LAYOUTS.bridge.obstacles.find(w=>w.id==='poker-table'),start={x:wall.x-FOOT_RADIUS,y:820};
  const slide=moveFootpoint(start,20,10,'bridge');assert.equal(slide.x,start.x);assert.equal(slide.y,start.y+10);
  const away=moveFootpoint(start,-20,0,'bridge');assert.equal(away.x,start.x-20);
  const corner={x:wall.x-FOOT_RADIUS,y:wall.y-FOOT_RADIUS};
  assert.equal(isWalkable(moveFootpoint(corner,10,10,'bridge'),'bridge'),true);
});

test('invalid or embedded feet recover to a free point without mutating input or becoming stuck', () => {
  for(const [environment,layout]of Object.entries(WORLD_LAYOUTS))for(const wall of layout.obstacles){
    const position={x:wall.x+wall.width/2,y:wall.y+wall.height/2},before={...position};
    const repaired=safePosition(position,environment);assert.equal(isWalkable(repaired,environment),true);assert.deepEqual(position,before);
    assert.deepEqual(safePosition(repaired,environment),repaired);
    const exits=[[25,0],[-25,0],[0,25],[0,-25]].map(([x,y])=>moveFootpoint(repaired,x,y,environment));
    assert.ok(exits.some(p=>p.x!==repaired.x||p.y!==repaired.y));assert.ok(exits.every(p=>isWalkable(p,environment)));
  }
  for(const environment of Object.keys(WORLD_LAYOUTS))for(const position of [null,{}, {x:NaN,y:Infinity},{x:-1e9,y:1e9}])assert.equal(isWalkable(safePosition(position,environment),environment),true);
});

test('diagonals and long/invalid frames cannot accelerate movement or tunnel through a wall',()=>{
  const start={x:900,y:820};
  const diagonal=movePosition(start,1,1,.05,'bridge'),long=movePosition(start,1,1,3600,'bridge');
  assert.deepEqual(diagonal,long);assert.equal(isWalkable(long,'bridge'),true);assert.ok(long.x<=920-FOOT_RADIUS);
  assert.ok(Math.hypot(diagonal.x-start.x,diagonal.y-start.y)<=WORLD.speed*.05+1e-9);
  for(const seconds of [NaN,Infinity,-20])assert.deepEqual(movePosition(start,1,0,seconds,'bridge'),start);
  assert.deepEqual(movePosition(DEFAULT_POSITION,Infinity,1,.05,'bridge'),DEFAULT_POSITION);
  for(const environment of Object.keys(WORLD_LAYOUTS)){
    const edge=moveFootpoint(initialPosition(),1e9,1e9,environment);assert.equal(isWalkable(edge,environment),true);assert.ok(edge.x<=b.right&&edge.y<=b.bottom);
  }
});

// Flood-fill actual legal swept moves, then replay the discovered routes as <=50 ms frames.
for(const environment of Object.keys(WORLD_LAYOUTS))test(`${environment}: spawn reaches both world sides and both approach zones`,()=>{
  const xs=Array.from({length:129},(_,i)=>b.left+i*24),ys=Array.from({length:14},(_,i)=>b.top+i*24);ys.push(b.bottom);
  const start={x:initialPosition().x,y:840},startKey=`${xs.indexOf(start.x)},${ys.indexOf(start.y)}`;
  assert.equal(isWalkable(start,environment),true);
  const queue=[startKey],paths=new Map([[startKey,null]]),points=new Map([[startKey,start]]),goals=new Map();
  for(let cursor=0;cursor<queue.length;cursor++){
    const key=queue[cursor],[ix,iy]=key.split(',').map(Number),point=points.get(key);
    if(point.x===b.left&&!goals.has('left'))goals.set('left',key);
    if(point.x===b.right&&!goals.has('right'))goals.set('right',key);
    const target=interactionAt(point,environment);if(target&&!goals.has(target))goals.set(target,key);
    for(const [ax,ay]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=ix+ax,ny=iy+ay;if(nx<0||nx>=xs.length||ny<0||ny>=ys.length)continue;
      const nextKey=`${nx},${ny}`;if(paths.has(nextKey))continue;
      const next={x:xs[nx],y:ys[ny]},moved=moveFootpoint(point,next.x-point.x,next.y-point.y,environment);
      if(moved.x!==next.x||moved.y!==next.y)continue;
      paths.set(nextKey,key);points.set(nextKey,next);queue.push(nextKey);
    }
  }
  for(const target of ['left','right','poker','computer']){
    assert.ok(goals.has(target),`${target} must be reachable`);
    const route=[];for(let key=goals.get(target);key!==null;key=paths.get(key))route.unshift(points.get(key));
    let actual=initialPosition();actual=movePosition(actual,0,-1,(actual.y-start.y)/WORLD.speed,environment);
    for(const next of route.slice(1)){
      const dx=next.x-actual.x,dy=next.y-actual.y,distance=Math.hypot(dx,dy);
      for(let i=0;i<2;i++)actual=movePosition(actual,Math.sign(dx),Math.sign(dy),distance/(2*WORLD.speed),environment);
      assert.ok(Math.abs(actual.x-next.x)<1e-8&&Math.abs(actual.y-next.y)<1e-8);assert.equal(isWalkable(actual,environment),true);
    }
  }
});

test('interaction selection is local, distance-limited and never available inside obstacles',()=>{
  for(const [environment,layout]of Object.entries(WORLD_LAYOUTS)){
    assert.equal(interactionAt(initialPosition(),environment),null);
    for(const area of layout.interactions)assert.equal(interactionAt({x:area.x,y:area.y},environment),area.target);
    for(const wall of layout.obstacles)assert.equal(interactionAt({x:wall.x+wall.width/2,y:wall.y+wall.height/2},environment),null);
    assert.equal(interactionAt({x:0,y:0},environment),null);
  }
  assert.equal(interactionAt({x:1277,y:788},'rental'),'poker','overlapping areas select the nearest target');
  assert.equal(interactionAt({x:1180,y:774},'loft'),null);
  assert.equal(interactionAt({x:1180,y:774},'toString'),null);
});
