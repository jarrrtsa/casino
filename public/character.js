const $=id=>document.getElementById(id);
const KEY='casino-identity-v1';
const COLORS={blue:'#5c7e96',amber:'#b59778',plum:'#987d96',sage:'#829c91'};
const money=n=>`${n<0?'−':''}$${Math.abs(n).toLocaleString('en-US')}`;
function read(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
export function createCharacterManager({onChange,onError,onSingleplayer}) {
  let identity=read(), profile=null, busy=false, afterCreate=null, job=null, answers=[], jobPlaying=false;
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(identity));}catch{onError('Character access cannot be saved in this browser. Keep this tab open.');}};
  async function api(path,data={}) {
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(identity.token?{Authorization:`Bearer ${identity.token}`}:{})},body:JSON.stringify(data)});
    const result=await response.json();if(!response.ok){const e=new Error(result.error);e.status=response.status;throw e;}return result;
  }
  function update(c){if(!c)return;profile=c;identity.name=c.name;persist();onChange(c);}
  async function refresh(){if(!identity.token)return;try{update(await api('/api/character'));}catch(error){if(error.status===401){identity={name:identity.name};persist();profile=null;onChange(null);}onError(error.message);}}
  async function task(fn){if(busy)return;busy=true;document.querySelectorAll('.dialog-error').forEach(e=>e.remove());document.querySelectorAll('.character-action').forEach(b=>b.disabled=true);try{await fn();}catch(error){const dialog=document.querySelector('dialog[open]:last-of-type')||document.querySelector('dialog[open]');if(dialog){const notice=document.createElement('p');notice.className='dialog-error';notice.setAttribute('role','alert');notice.textContent=error.message;dialog.append(notice);}else onError(error.message);}finally{busy=false;document.querySelectorAll('.character-action').forEach(b=>b.disabled=false);if(profile)renderBank();}}
  function portrait(element,outfit=profile?.outfit||'hoodie',color=profile?.color||'blue'){element.querySelector('use').setAttribute('href',`/assets/characters.svg#${outfit}`);element.style.color=COLORS[color]||COLORS.blue;}
  function renderCharacter(){
    $('character-name').value=profile?.name||identity.name||'';
    $('outfit').replaceChildren(...(profile?.catalog||[{id:'hoodie',name:'Hoodie',level:1,price:0}]).map(item=>{const option=document.createElement('option');option.value=item.id;const owned=profile?.owned.includes(item.id);option.textContent=`${item.name} · ${owned?'Owned':`$${item.price}`} · Level ${item.level}`;option.disabled=Boolean(profile&&profile.level<item.level);return option;}));
    $('outfit').value=profile?.outfit||'hoodie';$('character-color').value=profile?.color||'blue';
    $('character-stats').textContent=profile?`Level ${profile.level} · ${profile.xp} XP · ${profile.hands} hands · ${profile.wins} wins`:'New characters start with $1,000. XP and unlocks start at level 1.';
    $('character-submit').textContent=profile?'Save / purchase outfit':'Create character';
    $('delete-character').classList.toggle('hidden',!profile);preview();
  }
  function preview(){portrait($('character-preview'),$('outfit').value,$('character-color').value);}
  function renderBank(){if(!profile)return;$('bank-cash').textContent=money(profile.cash);$('bank-debt').textContent=money(profile.debt);$('bank-wealth').textContent=money(profile.wealth);$('borrow').disabled=busy||profile.debt>0||profile.cash>100||profile.inTable;$('repay').disabled=busy||!profile.debt||!profile.cash||profile.inTable;$('repayment').max=Math.min(profile.cash,profile.debt);$('repayment').value=Math.min(profile.cash,profile.debt)||'';$('bank-history').replaceChildren(...profile.transactions.map(t=>{const li=document.createElement('li');const label=document.createElement('span');label.textContent=t.kind;const value=document.createElement('strong');value.textContent=t.delta===0?'—':money(t.delta);li.append(label,value);return li;}));}
  function openCharacter(){renderCharacter();$('character-modal').showModal();}
  async function ensure(fn){await ready;if(!profile){afterCreate=fn;openCharacter();return;}fn();}
  $('character-form').onsubmit=e=>{e.preventDefault();void task(async()=>{
    const name=$('character-name').value.trim();if(!name)throw new Error('Enter a character name.');
    if(!profile){const color=$('character-color').value;identity.creationKey ||= crypto.randomUUID();persist();const r=await api('/api/character/create',{name,operation:identity.creationKey});identity={token:r.token,name:r.character.name};update(r.character);if(color!=='blue')update(await api('/api/character/customize',{operation:crypto.randomUUID(),name,outfit:'hoodie',color}));}
    else update(await api('/api/character/customize',{operation:crypto.randomUUID(),name,outfit:$('outfit').value,color:$('character-color').value}));
    $('character-modal').close();const next=afterCreate;afterCreate=null;if(next)next();
  });};
  $('outfit').onchange=preview;$('character-color').onchange=preview;
  $('borrow').onclick=()=>void task(async()=>update(await api('/api/wallet/borrow',{operation:crypto.randomUUID()})));
  $('repay-form').onsubmit=e=>{e.preventDefault();void task(async()=>update(await api('/api/wallet/repay',{operation:crypto.randomUUID(),amount:Number($('repayment').value)})));};
  $('npc-start').onclick=()=>void task(async()=>{await onSingleplayer(Number($('npc-buyin').value));if(profile?.inTable)$('singleplayer-dialog').close();});
  $('delete-character').onclick=()=>{$('delete-name').value='';$('delete-warning').textContent=`Type “${profile.name}” to delete this character. Cash, debt, history, XP and owned items will be lost. This cannot be undone.`;$('delete-dialog').showModal();};
  $('delete-form').onsubmit=e=>{e.preventDefault();void task(async()=>{await api('/api/character/delete',{name:$('delete-name').value});identity={};profile=null;persist();$('delete-dialog').close();$('character-modal').close();onChange(null);});};
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  $('job-start').onclick=()=>void task(async()=>{
    if(jobPlaying)return;job=await api('/api/job/start');answers=[];jobPlaying=true;$('job-start').disabled=true;
    $('job-status').textContent='Watch the four delivery stops.';document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=true);
    for(const index of job.pattern){const b=document.querySelector(`[data-stop="${index}"]`);b.classList.add('lit');await delay(520);b.classList.remove('lit');await delay(200);}
    $('job-status').textContent='Repeat the route in order.';document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=false);
  });
  document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>{if(!jobPlaying)return;answers.push(Number(b.dataset.stop));$('job-status').textContent=`${answers.length} / 4 stops`;
    if(answers.length===4){jobPlaying=false;document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=true);void task(async()=>{try{update(await api('/api/job/finish',{id:job.id,answers}));$('job-status').textContent='Delivery complete · +$30';}finally{$('job-start').disabled=false;}});}
  });
  const ready=refresh();
  return {ready,get token(){return identity.token;},get profile(){return profile;},update,refresh,portrait,ensure,
    open(key){if(key==='character'){void ready.then(openCharacter);return;}void ensure(()=>{if(key==='bank'){renderBank();$('bank-dialog').showModal();}else if(key==='jobs'){$('job-dialog').showModal();}else if(key==='singleplayer'){$('singleplayer-dialog').showModal();}});}
  };
}
