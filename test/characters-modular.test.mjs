import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createEconomy} from '../economy.mjs';
import {characterMarkup} from '../public/character-renderer.mjs';
import {normalizeAppearance} from '../public/appearance.mjs';

test('both poses assemble all 3750 selections with body-specific fitting and seated hands above clothes',()=>{
  for(const pose of ['standing','seated']){
    const pack=JSON.parse(readFileSync(new URL(`../public/assets/characters-v01/${pose}/parts-data.json`,import.meta.url)));
    for(let body=1;body<=5;body++)for(let top=1;top<=5;top++)for(let bottom=1;bottom<=5;bottom++)for(let head=1;head<=5;head++)for(let accessory=0;accessory<=5;accessory++){
      const svg=characterMarkup({body,top,bottom,head,accessory},pose),base=pack.bases[body-1];
      assert.ok(!svg.includes('undefined')&&!svg.includes('NaN'));
      assert.ok(svg.includes(`scale(${base.width} 1)`));assert.ok(svg.includes(`scale(${base.head} 1)`));
      assert.ok(svg.indexOf(base.body)<svg.indexOf(pack.bottoms[bottom-1].svg));
      assert.ok(svg.indexOf(base.headSvg)<svg.indexOf(pack.tops[top-1].svg));
      if(pose==='seated')assert.ok(svg.indexOf(base.hands)>svg.indexOf(pack.tops[top-1].svg));
    }
  }
});
test('modular appearance preserves defaults, legacy purchases and separates XP unlocks from purchases',()=>{
  const economy=createEconomy();
  try{
    const {character:c}=economy.create('Modular',randomUUID());
    assert.deepEqual(c.appearance,{body:1,top:1,bottom:1,head:1,accessory:0});
    const appearance={...c.appearance,body:5};
    const op=randomUUID(),saved=economy.mutate(c.id,op,'customize',{name:'Modular',appearance});
    assert.deepEqual(saved.appearance,appearance);assert.equal(saved.cash,1000);
    assert.deepEqual(economy.mutate(c.id,op,'customize',{appearance}).appearance,saved.appearance);
    for(const slot of ['top','bottom','head','accessory']){
      assert.throws(()=>economy.mutate(c.id,randomUUID(),'customize',{appearance:{...appearance,[slot]:slot==='accessory'?5:3}}),/Unlocked/);
    }
    assert.equal(economy.view(c.id).cash,1000);
    assert.throws(()=>economy.mutate(c.id,randomUUID(),'customize',{appearance:{...appearance,body:99}}),/Invalid/);
    economy.mutate(c.id,randomUUID(),'customize',{outfit:'cap'});
    const owned=economy.view(c.id);assert.ok(owned.ownedParts.includes('head:4'));assert.equal(owned.cash,950);
    const selected={...owned.appearance,body:3,head:4};
    const result=economy.mutate(c.id,randomUUID(),'customize',{appearance:selected});
    assert.equal(result.cash,950);assert.deepEqual(result.appearance,selected);
    assert.equal(result.cosmeticCatalog.find(item=>item.id==='head:2').level,1);
    assert.ok(!result.ownedParts.includes('head:2'));
    const purchase=randomUUID(),next={...selected,head:2};
    const bought=economy.mutate(c.id,purchase,'customize',{appearance:next});
    assert.equal(bought.cash,900);assert.ok(bought.ownedParts.includes('head:2'));
    assert.equal(economy.mutate(c.id,purchase,'customize',{appearance:next}).cash,900);
    assert.equal(economy.mutate(c.id,randomUUID(),'customize',{appearance:next}).cash,900);


    const player={id:'modular-seat',characterId:c.id,stack:0};
    for(let hand=0;hand<3;hand++)economy.settle([player],{seats:[{id:player.id}],results:[{id:player.id}]},`xp-${hand}`);
    const unlocked=economy.view(c.id);assert.equal(unlocked.level,2);assert.ok(!unlocked.ownedParts.includes('top:3'));
    const earned=economy.mutate(c.id,randomUUID(),'customize',{appearance:{...next,top:3}});
    assert.ok(earned.ownedParts.includes('top:3'));assert.equal(earned.cash,775);
    assert.deepEqual(normalizeAppearance({outfit:'coat'}),{body:1,top:5,bottom:1,head:1,accessory:0});
  }finally{economy.close();}
});

