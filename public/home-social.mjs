// Request generations prevent an old poll or identity response replacing a new lobby.
export function createHomeSocialClient({request,onChange=()=>{}}){
  let home=null,generation=0,mutating=false,pollSequence=0;
  const change=value=>{home=value;onChange(home);return home;};
  async function mutate(path,data={}){
    if(mutating)throw new Error('Please wait for the current home action.');
    mutating=true;const stamp=++generation;
    try{const result=await request(path,data);if(stamp!==generation)return home;return change(path.endsWith('/leave')?null:result.home);}
    finally{mutating=false;}
  }
  return {
    get home(){return home;},get busy(){return mutating;},
    reset(){generation++;change(null);},
    create:()=>mutate('/api/home/create'),join:code=>mutate('/api/home/join',{code}),
    leave:()=>mutate('/api/home/leave'),transfer:characterId=>mutate('/api/home/transfer',{characterId}),
    async refresh(){if(mutating)return home;const stamp=generation,poll=++pollSequence,result=await request('/api/home/view');return stamp===generation&&poll===pollSequence?change(result.home):home;}
  };
}
