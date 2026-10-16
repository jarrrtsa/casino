import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCharacterManager } from '../public/character.js';

const OLD = 'a'.repeat(64), NEW = 'b'.repeat(64), KEY = 'c'.repeat(64);
const profile = (id='old',name='Old') => ({id,name,cash:1000,debt:0,wealth:1000,xp:0,level:1,hands:0,wins:0,owned:['hoodie'],outfit:'hoodie',color:'blue',inTable:false,transactions:[],catalog:[{id:'hoodie',name:'Hoodie',price:0,level:1}]});
const reply = (status,data) => ({status,ok:status<400,headers:{get:()=> '60'},json:async()=>data});
const tick = () => new Promise(resolve=>setImmediate(resolve));
const event = {preventDefault(){}};

// Minimal DOM/platform fixture; handlers are the production character manager.
function platform(t, initial, send) {
  class Element {
    constructor(id='',classes='') {this.id=id;this.value='';this.open=false;this.checked=false;this.disabled=false;this.children=[];this.style={};this.dataset={};this.listeners={};this.attributes={};const values=new Set(classes.split(' '));this.classList={add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),toggle:(v,on)=>{const active=on??!values.has(v);active?values.add(v):values.delete(v);return active;}};}
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
    showModal(){this.open=true;}
    close(){if(!this.open)return;this.open=false;for(const fn of this.listeners.close||[])fn();}
    replaceChildren(...children){this.children=children;}
    append(child){this.children.push(child);}
    setAttribute(name,value){this.attributes[name]=value;}
    querySelector(){return this.use ||= new Element();}
    focus(){this.focused=true;}
    select(){this.selected=true;}
    remove(){for(const element of elements.values())element.children=element.children.filter(c=>c!==this);}
  }
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),elements=new Map(),actions=[],dialogs=[];
  for(const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const classes=match[0].match(/class="([^"]*)"/)?.[1]||'',element=new Element(match[2],classes);elements.set(match[2],element);
    if(classes.includes('character-action'))actions.push(element);if(match[1]==='dialog')dialogs.push(element);
  }
  const stops=Array.from({length:4},(_,index)=>{const element=new Element();element.dataset.stop=String(index);return element;});
  const document={getElementById:id=>{assert.ok(elements.has(id),`UI element ${id} exists in the real HTML`);return elements.get(id);},createElement:()=>new Element(),
    querySelectorAll:selector=>selector==='[data-stop]'?stops:selector==='dialog[open]'?dialogs.filter(e=>e.open):selector==='.character-action'?actions:selector==='.dialog-error'?[...elements.values()].flatMap(e=>e.children.filter(c=>c.className==='dialog-error')):[],
    querySelector:selector=>selector.startsWith('[data-stop=')?stops[Number(selector.match(/\d/)[0])]:null};
  const saved=new Map(initial?[['casino-identity-v1',JSON.stringify(initial)]]:[]),errors=[],changes=[];
  const replace={document,window:{listeners:{},addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},dispatch(type,event){for(const fn of this.listeners[type]||[])fn(event);}},localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},fetch:send,navigator:{clipboard:{writeText:async()=>{throw new Error('Clipboard denied');}}}};
  const previous=new Map(Object.keys(replace).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(replace))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  let resets=0;
  const manager=createCharacterManager({onChange:c=>changes.push(c),onError:text=>errors.push(text),onSingleplayer:async()=>{},onIdentityChange:()=>{resets++;for(const d of dialogs)d.close();}});
  return {manager,e:id=>elements.get(id),saved,errors,changes,emitStorage:()=>replace.window.dispatch('storage',{key:'casino-identity-v1'}),get resets(){return resets;}};
}

test('UI key creation requires acknowledgement, manual copy works and close clears the key',async t=>{
  let issued=0;const env=platform(t,{token:OLD},async path=>path.endsWith('recovery-key')?(issued++,reply(200,{recoveryKey:KEY})):reply(200,profile()));
  await env.manager.ready;env.manager.open('character');await tick();assert.equal(issued,0);assert.equal(env.e('recovery-key-open').classList.contains('hidden'),false);
  env.e('recovery-key-open').onclick();env.e('recovery-key-form').onsubmit(event);await tick();assert.equal(issued,0);
  env.e('key-replace-confirm').checked=true;env.e('recovery-key-form').onsubmit(event);await tick();assert.equal(issued,1);assert.equal(env.e('recovery-key').value,KEY);
  env.e('recovery-key-copy').onclick();await tick();assert.equal(env.e('recovery-key').selected,true);assert.match(env.e('recovery-key-status').textContent,/manually/);
  env.e('recovery-key-dialog').close();assert.equal(env.e('recovery-key').value,'');assert.equal(env.e('recovery-key-copy').disabled,true);assert.equal(env.e('key-replace-confirm').checked,false);
  assert.ok(!env.saved.get('casino-identity-v1').includes(KEY));env.e('recovery-key-open').onclick();assert.equal(env.e('recovery-key-status').textContent,'');
});

test('UI ignores a key response after the key window closes',async t=>{
  let finish;const pending=new Promise(resolve=>finish=resolve);
  const env=platform(t,{token:OLD},async path=>path.endsWith('recovery-key')?pending:reply(200,profile()));await env.manager.ready;
  env.e('recovery-key-open').onclick();env.e('key-replace-confirm').checked=true;env.e('recovery-key-form').onsubmit(event);env.e('recovery-key-dialog').close();
  finish(reply(200,{recoveryKey:KEY}));await tick();assert.equal(env.e('recovery-key').value,'');assert.equal(env.e('recovery-key-result').classList.contains('hidden'),true);
});

test('UI requires switch confirmation and clears old fields/jobs on successful recovery',async t=>{
  let recovered=0;const env=platform(t,{token:OLD,name:'Old',creationKey:'old-creation-key'},async path=>path.endsWith('/recover')?(recovered++,reply(200,{token:NEW,character:profile('new','New')})):reply(200,profile()));
  await env.manager.ready;env.manager.open('character');await tick();env.e('recover-open').onclick();assert.equal(env.e('recover-confirm').required,true);assert.match(env.e('recover-warning').textContent,/not be deleted/);
  env.e('recover-key').value=KEY;env.e('recover-form').onsubmit(event);await tick();assert.equal(recovered,0);assert.equal(env.manager.token,OLD);
  env.e('recover-confirm').checked=true;env.e('recover-form').onsubmit(event);await tick();assert.equal(recovered,1);assert.equal(env.manager.token,NEW);assert.equal(env.manager.profile.id,'new');
  assert.equal(env.e('recover-key').value,'');assert.equal(env.e('recover-confirm').checked,false);assert.equal(env.e('recovery-dialog').open,false);assert.equal(env.e('job-status').textContent,'Ready for a delivery.');assert.equal(env.resets,1);
  assert.deepEqual(JSON.parse(env.saved.get('casino-identity-v1')),{token:NEW,name:'New'});
});

test('UI shows API 409 in the topmost recovery dialog and preserves old identity',async t=>{
  const env=platform(t,{token:OLD},async path=>path.endsWith('/recover')?reply(409,{}):reply(200,profile()));await env.manager.ready;env.manager.open('character');await tick();
  env.e('recover-open').onclick();env.e('recover-key').value=KEY;env.e('recover-confirm').checked=true;env.e('recover-form').onsubmit(event);await tick();
  assert.equal(env.manager.token,OLD);assert.equal(env.manager.profile.id,'old');assert.equal(env.resets,0);
  assert.match(env.e('recovery-dialog').children.find(c=>c.className==='dialog-error').textContent,/active table/);
  env.e('recovery-dialog').close();assert.equal(env.e('recover-key').value,'');
});

test('UI can create a character with the selected modular appearance through the identity boundary',async t=>{
  const env=platform(t,null,async(path,init)=>path.endsWith('/create')?reply(200,{token:OLD,character:profile()}):reply(200,{...profile(),appearance:JSON.parse(init.body).appearance}));await env.manager.ready;
  env.manager.open('character');await tick();env.e('character-name').value='Old';env.e('character-body').value='3';env.e('character-form').onsubmit(event);await tick();
  assert.equal(env.manager.token,OLD);assert.deepEqual(env.manager.profile.appearance,{body:3,top:1,bottom:1,head:1,accessory:0});assert.equal(env.errors.length,0);assert.equal(env.e('character-modal').open,false);
});

test('UI reloads the adopted token when a late old response arrives before the storage event',async t=>{
  let finish,wait=false;const pending=new Promise(resolve=>finish=resolve);
  const env=platform(t,{token:OLD,name:'Old'},async(path,init)=>init.headers.Authorization===`Bearer ${NEW}`?reply(200,profile('new','New')):wait?pending:reply(200,profile()));
  await env.manager.ready;wait=true;const oldRefresh=env.manager.refresh();
  env.saved.set('casino-identity-v1',JSON.stringify({token:NEW,name:'New'}));finish(reply(401,{}));await oldRefresh;
  assert.equal(env.manager.token,NEW);assert.equal(env.manager.profile,null);
  env.emitStorage();await tick();assert.equal(env.manager.profile.id,'new');assert.equal(env.errors.length,0);assert.equal(JSON.parse(env.saved.get('casino-identity-v1')).token,NEW);
});
