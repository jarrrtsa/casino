import { randomBytes, randomUUID } from 'node:crypto';

const reject=(status,message)=>{throw Object.assign(new Error(message),{status});};

// Home membership is separate from poker seats and never touches the wallet.
export function createHomeLobbies({character,now=Date.now,maxMembers=6,maxRooms=100,idleMs=600000,onChange=()=>{}}={}) {
  const rooms=new Map(),memberships=new Map();
  function remove(id){
    const code=memberships.get(id),room=rooms.get(code);
    if(!room)return false;
    room.members.delete(id);memberships.delete(id);
    if(!room.members.size)rooms.delete(code);
    else if(room.hostId===id)room.hostId=room.members.keys().next().value;
    onChange(room.id);
    return true;
  }
  function cleanup(){
    for(const [id,code] of memberships){
      const room=rooms.get(code);let c;
      try{c=character(id);}catch{remove(id);continue;}
      // A poker player keeps home membership while their table lease is active.
      if(!c.inTable&&now()-room.members.get(id)>=idleMs)remove(id);
    }
  }
  function roomFor(id){return rooms.get(memberships.get(id));}
  function snapshot(room){
    return {id:room.id,code:room.code,hostId:room.hostId,homeOwnerId:room.ownerId,environment:room.environment,
      capacity:maxMembers,players:[...room.members.keys()].map(id=>{
        const c=character(id);return {id,name:c.name,appearance:{outfit:c.outfit,color:c.color},host:id===room.hostId};
      })};
  }
  function touch(room,id){room.members.set(id,now());return snapshot(room);}
  return {
    cleanup,remove,
    peek(id){const room=[...rooms.values()].find(room=>room.id===id);return room?snapshot(room):null;},
    create(id){
      cleanup();const existing=roomFor(id);if(existing)return touch(existing,id);
      const c=character(id);if(c.inTable)reject(409,'Return home from your poker table first.');
      if(rooms.size>=maxRooms)reject(503,'Home lobbies are full. Try again later.');
      let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
      const room={id:randomUUID(),code,ownerId:id,hostId:id,environment:c.home.id,members:new Map([[id,now()]])};
      rooms.set(code,room);memberships.set(id,code);onChange(room.id);return snapshot(room);
    },
    join(id,input){
      cleanup();const code=typeof input==='string'?input.trim().toUpperCase():'';
      if(!/^[A-F0-9]{6}$/.test(code))reject(404,'Home lobby not found. Check the code.');
      const room=rooms.get(code);if(!room)reject(404,'Home lobby not found. Check the code.');
      const existing=roomFor(id);
      if(existing){if(existing===room)return touch(room,id);reject(409,'Leave your current home lobby first.');}
      if(character(id).inTable)reject(409,'Return home from your poker table first.');
      if(room.members.size>=maxMembers)reject(409,'Home lobby is full.');
      room.members.set(id,now());memberships.set(id,code);onChange(room.id);return snapshot(room);
    },
    view(id){cleanup();const room=roomFor(id);return room?touch(room,id):null;},
    leave(id){cleanup();return {ok:true,left:remove(id)};},
    transfer(id,target){
      cleanup();const room=roomFor(id);if(!room)reject(404,'Join a home lobby first.');
      if(room.hostId!==id)reject(403,'Only the host can transfer the home lobby.');
      if(!room.members.has(target))reject(400,'Choose a player in this home lobby.');
      room.hostId=target;return touch(room,id);
    }
  };
}
