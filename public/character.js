const KEY = 'casino-identity-v1';
const ACCESS_WARNING = 'Character access could not be saved in this browser. Keep this tab open and keep your recovery key safe before closing it.';
const stale = () => Object.assign(new Error('Outdated character response.'), { stale: true });
const fail = (message, status) => Object.assign(new Error(message), { status });

// Browser-independent identity boundary, also exercised against the real API in tests.
export function createIdentityClient({ storage, fetch: send = globalThis.fetch, onChange = () => {}, onReplace = () => {}, onUnauthorized = () => {}, onStorageError = () => {} } = {}) {
  let identity = {}, profile = null, revision = 0, recovering = false;
  const responses = new WeakMap();
  try { identity = JSON.parse(storage?.getItem(KEY)) || {}; } catch { /* Recovery remains available when browser storage cannot be read. */ }
  if (typeof identity !== 'object' || Array.isArray(identity)) identity = {};
  let storedToken=identity.token;
  function syncStorage() {
    let saved;
    try { saved=JSON.parse(storage?.getItem(KEY))||{}; } catch { return false; }
    if(typeof saved!=='object'||Array.isArray(saved)||saved.token===storedToken)return false;
    revision++;recovering=false;identity=saved;profile=null;storedToken=saved.token;
    onReplace();onChange(null);return true;
  }
  function persist() {
    try { if (!storage) throw new Error(); const saved=JSON.parse(storage.getItem(KEY))||{};if(saved.token!==storedToken)throw new Error();storage.setItem(KEY, JSON.stringify(identity));storedToken=identity.token;return true; }
    catch { onStorageError(ACCESS_WARNING); return false; }
  }
  function assertCurrent(stamp) { if (stamp !== revision || recovering) throw stale(); }
  function update(character, stamp = responses.get(character) ?? revision) {
    if (!character || stamp !== revision || recovering || (profile && character.id !== profile.id)) return false;
    profile = character; identity.name = character.name; onChange(profile); return true;
  }
  function replace(result) {
    if (!result || typeof result.token !== 'string' || !/^[a-f0-9]{64}$/.test(result.token) || !result.character?.id) throw fail('Invalid server response. Please try recovery again.', 502);
    revision++; recovering = false;
    identity = { token: result.token, name: result.character.name }; profile = result.character;
    onReplace(); onChange(profile); persist();
    return profile;
  }
  function forget(keepName = false) {
    revision++; recovering = false;
    identity = keepName ? { name: identity.name } : {}; profile = null;
    onReplace(); onChange(null); persist();
  }
  async function wire(path, data = {}, { anonymous = false, sessionToken, game = false, allowRecovery = false } = {}) {
    if (recovering && !allowRecovery) throw fail('Recovery is in progress. Please wait.', 409);
    if(syncStorage()&&allowRecovery)throw stale();
    const stamp = revision, token = identity.token;
    let response, result;
    try {
      response = await send(path, { method: 'POST', headers: { 'Content-Type': 'application/json',
        ...(!anonymous && token ? ((sessionToken || game) ? { 'X-Character-Token': token } : { Authorization: `Bearer ${token}` }) : {}),
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) }, body: JSON.stringify(data) });
      result = await response.json();
    } catch {
      syncStorage();if (stamp !== revision) throw stale();
      throw fail('Connection failed. Please try again.', 503);
    }
    syncStorage();if (stamp !== revision) throw stale();
    if (!response.ok) {
      if (response.status === 401 && !anonymous && !sessionToken && !game) { forget(true); onUnauthorized(); }
      const wait = Number(response.headers?.get('Retry-After'));
      const message = response.status === 429 ? `Too many attempts. Try again in ${Number.isFinite(wait) && wait > 0 && wait <= 3600 ? Math.ceil(wait) : 60} seconds.`
        : response.status === 409 && (path.endsWith('/recover') || path.endsWith('/recovery-key')) ? 'Return home from the active table before creating a key or recovering a character. On another device, wait for the hand to finish and leave the table.'
        : response.status >= 500 ? 'Service unavailable. Please try again.'
        : response.status === 401 ? anonymous ? 'Invalid recovery key. Check the key and try again.' : 'Character access has expired. Recover your character or create a new one.'
        : result?.error || 'Request failed. Please try again.';
      throw fail(message, response.status);
    }
    for (const value of [result, result?.room, result?.character, result?.room?.character]) {
      if (value && typeof value === 'object') responses.set(value, stamp);
    }
    return result;
  }
  async function refresh() {
    syncStorage();
    if (!identity.token) return null;
    const stamp = revision, result = await wire('/api/character');
    assertCurrent(stamp); update(result, stamp); return result;
  }
  return {
    get token() { return identity.token; }, get identity() { return { ...identity }; }, get profile() { return profile; },
    stamp: () => revision, assertCurrent, isCurrent: stamp => stamp === revision && !recovering,
    update, refresh, forget, syncStorage, request: wire,
    gameRequest: (path, data, sessionToken) => wire(path, data, { sessionToken, game: true }),
    isResponseCurrent: response => !recovering && (responses.get(response) === undefined || responses.get(response) === revision),
    async create(name) {
      syncStorage();
      if (identity.token) throw fail('Existing character access is saved. Retry loading it or use Recover character before creating a replacement.', 409);
      identity.creationKey ||= crypto.randomUUID(); persist();
      const result = await wire('/api/character/create', { name, operation: identity.creationKey }, { anonymous: true });
      return replace(result);
    },
    async issueRecovery() {
      if (profile?.inTable) throw fail('Return home from your table before creating a recovery key.', 409);
      const result = await wire('/api/character/recovery-key');
      if (!result || typeof result.recoveryKey !== 'string' || !/^[a-f0-9]{64}$/.test(result.recoveryKey)) throw fail('Invalid server response. Create a new recovery key.', 502);
      return result.recoveryKey;
    },
    async recover(key, { confirmed = false, hasTable = false } = {}) {
      if(syncStorage())throw fail('Character access changed in another tab. Reopen recovery before replacing it.',409);
      if (recovering) throw fail('Recovery is already in progress.', 409);
      if (hasTable || profile?.inTable) throw fail('Return home from your table before recovering a character.', 409);
      if (identity.token && !confirmed) throw fail('Confirm replacing this browser’s character access. Your previous character will not be deleted.', 400);
      key = typeof key === 'string' ? key.trim().toLowerCase() : '';
      if (!/^[a-f0-9]{64}$/.test(key)) throw fail('Enter the complete 64-character recovery key.', 400);
      // Fence all requests that started before recovery, even if recovery later fails.
      revision++; recovering = true;
      try { return replace(await wire('/api/character/recover', { recoveryKey: key }, { anonymous: true, allowRecovery: true })); }
      finally { recovering = false; }
    }
  };
}

export async function copyRecoveryKey(key, { writeText, select, onStatus, isCurrent = () => true }) {
  if (!key) return;
  try { await writeText(key); if (isCurrent()) onStatus('Recovery key copied. Save it somewhere private.'); }
  catch { if (isCurrent()) { select(); onStatus('Clipboard unavailable. The key is selected: copy it manually with Ctrl+C or your device’s Copy command.'); } }
}

const $=id=>document.getElementById(id);

const COLORS={blue:'#5c7e96',amber:'#b59778',plum:'#987d96',sage:'#829c91'};
const money=n=>`${n<0?'−':''}$${Math.abs(n).toLocaleString('en-US')}`;

export function createCharacterManager({onChange,onError,onSingleplayer,onIdentityChange=()=>{},hasTable=()=>false}) {
  let profile=null, busy=false, afterCreate=null, job=null, answers=[], jobPlaying=false, keyView=0;
  let storage; try { storage=localStorage; } catch { /* In-memory access remains usable. */ }
  const client=createIdentityClient({storage,onChange:c=>{profile=c;onChange(c);},onStorageError:onError,
    onReplace:()=>{afterCreate=null;job=null;answers=[];jobPlaying=false;clearKeyView();clearRecoveryView();$('job-start').disabled=false;document.querySelectorAll('[data-stop]').forEach(b=>{b.disabled=true;b.classList.remove('lit');});$('job-status').textContent='Ready for a delivery.';onIdentityChange();},
    onUnauthorized:()=>openCharacter()});
  const api=(path,data)=>client.request(path,data);
  const update=c=>client.update(c);
  async function refresh(){try{return await client.refresh();}catch(error){if(!error.stale)onError(error.message);}}  async function task(fn){if(busy)return;busy=true;document.querySelectorAll('.dialog-error').forEach(e=>e.remove());document.querySelectorAll('.character-action').forEach(b=>b.disabled=true);try{await fn();}catch(error){if(error.stale)return;const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog){const notice=document.createElement('p');notice.className='dialog-error';notice.setAttribute('role','alert');notice.textContent=error.message;dialog.append(notice);}else onError(error.message);}finally{busy=false;document.querySelectorAll('.character-action').forEach(b=>b.disabled=false);if(profile)renderBank();}}
  function portrait(element,outfit=profile?.outfit||'hoodie',color=profile?.color||'blue'){element.querySelector('use').setAttribute('href',`/assets/characters.svg#${outfit}`);element.style.color=COLORS[color]||COLORS.blue;}
  function renderCharacter(){
    $('character-name').value=profile?.name||client.identity.name||'';
    $('outfit').replaceChildren(...(profile?.catalog||[{id:'hoodie',name:'Hoodie',level:1,price:0}]).map(item=>{const option=document.createElement('option');option.value=item.id;const owned=profile?.owned.includes(item.id);option.textContent=`${item.name} · ${owned?'Owned':`$${item.price}`} · Level ${item.level}`;option.disabled=Boolean(profile&&profile.level<item.level);return option;}));
    $('outfit').value=profile?.outfit||'hoodie';$('character-color').value=profile?.color||'blue';
    $('character-stats').textContent=profile?`Level ${profile.level} · ${profile.xp} XP · ${profile.hands} hands · ${profile.wins} wins`:'New characters start with $1,000. XP and unlocks start at level 1.';
    $('character-submit').textContent=profile?'Save / purchase outfit':'Create character';
    $('delete-character').classList.toggle('hidden',!profile);$('recovery-key-open').classList.toggle('hidden',!profile);preview();
  }
  function preview(){portrait($('character-preview'),$('outfit').value,$('character-color').value);}
  function renderBank(){if(!profile)return;$('bank-cash').textContent=money(profile.cash);$('bank-debt').textContent=money(profile.debt);$('bank-wealth').textContent=money(profile.wealth);$('borrow').disabled=busy||profile.debt>0||profile.cash>100||profile.inTable;$('repay').disabled=busy||!profile.debt||!profile.cash||profile.inTable;$('repayment').max=Math.min(profile.cash,profile.debt);$('repayment').value=Math.min(profile.cash,profile.debt)||'';$('bank-history').replaceChildren(...profile.transactions.map(t=>{const li=document.createElement('li');const label=document.createElement('span');label.textContent=t.kind;const value=document.createElement('strong');value.textContent=t.delta===0?'—':money(t.delta);li.append(label,value);return li;}));}
  function openCharacter(){renderCharacter();$('character-modal').showModal();}
  async function ensure(fn){await ready;if(!profile){afterCreate=fn;openCharacter();return;}fn();}
  $('character-form').onsubmit=e=>{e.preventDefault();void task(async()=>{
    const name=$('character-name').value.trim();if(!name)throw new Error('Enter a character name.');
    const next=afterCreate;
    if(!profile){const color=$('character-color').value;await client.create(name);if(color!=='blue')update(await api('/api/character/customize',{operation:crypto.randomUUID(),name,outfit:'hoodie',color}));}
    else update(await api('/api/character/customize',{operation:crypto.randomUUID(),name,outfit:$('outfit').value,color:$('character-color').value}));
    $('character-modal').close();afterCreate=null;if(next)next();
  });};
  $('outfit').onchange=preview;$('character-color').onchange=preview;
  $('borrow').onclick=()=>void task(async()=>update(await api('/api/wallet/borrow',{operation:crypto.randomUUID()})));
  $('repay-form').onsubmit=e=>{e.preventDefault();void task(async()=>update(await api('/api/wallet/repay',{operation:crypto.randomUUID(),amount:Number($('repayment').value)})));};
  $('npc-start').onclick=()=>void task(async()=>{await onSingleplayer(Number($('npc-buyin').value));if(profile?.inTable)$('singleplayer-dialog').close();});
  $('delete-character').onclick=()=>{$('delete-name').value='';$('delete-warning').textContent=`Type “${profile.name}” to delete this character. Cash, debt, history, XP and owned items will be lost. This cannot be undone.`;$('delete-dialog').showModal();};
  $('delete-form').onsubmit=e=>{e.preventDefault();void task(async()=>{await api('/api/character/delete',{name:$('delete-name').value});client.forget();$('delete-dialog').close();$('character-modal').close();});};
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  $('job-start').onclick=()=>void task(async()=>{
    const stamp=client.stamp();if(jobPlaying)return;job=await api('/api/job/start');answers=[];jobPlaying=true;$('job-start').disabled=true;
    $('job-status').textContent='Watch the four delivery stops.';document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=true);
    for(const index of job.pattern){const b=document.querySelector(`[data-stop="${index}"]`);b.classList.add('lit');await delay(520);client.assertCurrent(stamp);b.classList.remove('lit');await delay(200);client.assertCurrent(stamp);}
    $('job-status').textContent='Repeat the route in order.';document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=false);
  });
  document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>{if(!jobPlaying)return;answers.push(Number(b.dataset.stop));$('job-status').textContent=`${answers.length} / 4 stops`;
    if(answers.length===4){const stamp=client.stamp();jobPlaying=false;document.querySelectorAll('[data-stop]').forEach(b=>b.disabled=true);void task(async()=>{try{const result=await api('/api/job/finish',{id:job.id,answers});client.assertCurrent(stamp);update(result);$('job-status').textContent='Delivery complete · +$30';}finally{if(client.isCurrent(stamp))$('job-start').disabled=false;}});}
  });
  function clearKeyView(){keyView++;$('recovery-key').value='';$('recovery-key-result').classList.add('hidden');$('recovery-key-copy').disabled=true;$('key-replace-confirm').checked=false;$('recovery-key-status').textContent='';}
  function clearRecoveryView(){$('recover-key').value='';$('recover-confirm').checked=false;}
  $('recovery-key-dialog').addEventListener('close',clearKeyView);
  $('recovery-dialog').addEventListener('close',clearRecoveryView);
  window.addEventListener('pagehide',()=>{clearKeyView();clearRecoveryView();});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){if(client.syncStorage()||(!profile&&client.token))void refresh();}});
  $('recovery-key-open').onclick=()=>{clearKeyView();$('recovery-key-dialog').showModal();};
  $('recovery-key-form').onsubmit=e=>{e.preventDefault();void task(async()=>{
    if(!$('key-replace-confirm').checked)throw new Error('Confirm that a new key replaces the previous recovery key.');
    if(hasTable())throw new Error('Return home from your table before creating a recovery key.');
    const view=keyView,key=await client.issueRecovery();
    if(view!==keyView||!$('recovery-key-dialog').open)return;
    $('recovery-key').value=key;$('recovery-key-result').classList.remove('hidden');$('recovery-key-copy').disabled=false;
    $('recovery-key-status').textContent='Save this key privately. It will be cleared when this window closes.';
  });};
  $('recovery-key-copy').onclick=()=>{const view=keyView;void copyRecoveryKey($('recovery-key').value,{
    writeText:key=>navigator.clipboard.writeText(key),select:()=>{$('recovery-key').focus();$('recovery-key').select();},
    onStatus:text=>$('recovery-key-status').textContent=text,isCurrent:()=>view===keyView&&$('recovery-key-dialog').open});};
  $('recover-open').onclick=()=>{
    clearRecoveryView();$('recover-confirm-row').classList.toggle('hidden',!client.token);$('recover-confirm').required=Boolean(client.token);
    $('recover-warning').textContent=client.token?`This will replace access to ${profile?.name||client.identity.name||'your current character'} in this browser. That character will not be deleted. Save its recovery key first.`:'Restore an existing character without creating a new one.';
    $('recovery-dialog').showModal();
  };
  $('recover-form').onsubmit=e=>{e.preventDefault();void task(async()=>{
    // Refresh the current lease before accepting a switch; the server checks the target lease too.
    if(client.token)await client.refresh();
    await client.recover($('recover-key').value,{confirmed:$('recover-confirm').checked,hasTable:hasTable()});
    $('recovery-dialog').close();$('character-modal').close();
  });};
  const ready=refresh();
  return {ready,get token(){return client.token;},homeRequest:client.request,stamp:client.stamp,isCurrent:client.isCurrent,assertCurrent:client.assertCurrent,gameRequest:client.gameRequest,isResponseCurrent:client.isResponseCurrent,get profile(){return profile;},update,refresh,portrait,ensure,
    open(key){if(key==='character'){void ready.then(openCharacter);return;}void ensure(()=>{if(key==='bank'){renderBank();$('bank-dialog').showModal();}else if(key==='jobs'){$('job-dialog').showModal();}else if(key==='singleplayer'){$('singleplayer-dialog').showModal();}});}
  };
}
