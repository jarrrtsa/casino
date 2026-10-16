export const DEFAULT_APPEARANCE=Object.freeze({body:1,top:1,bottom:1,head:1,accessory:0});
export const PARTS=['top','bottom','head','accessory'];
export function normalizeAppearance(value={}){
  const legacy={...DEFAULT_APPEARANCE};
  if(value.outfit==='cap')legacy.head=4;
  if(value.outfit==='beanie')legacy.head=5;
  if(value.outfit==='coat')legacy.top=5;
  return Object.fromEntries(Object.entries(legacy).map(([key,fallback])=>[key,Number.isInteger(value[key])&&value[key]>=(key==='accessory'?0:1)&&value[key]<=5?value[key]:fallback]));
}
export function ownedParts(character){
  const owned=new Set(['top:1','bottom:1','head:1','accessory:0',...(character.ownedParts||[])]);
  for(const outfit of character.owned||[]){if(outfit==='cap')owned.add('head:4');if(outfit==='beanie')owned.add('head:5');if(outfit==='coat')owned.add('top:5');}
  return [...owned];
}
// Initial progression tuning; item ownership is independent of XP eligibility.
export const PART_NAMES={
 body:['Slim · light','Standard · warm','Broad · olive','Stocky · dark','Lean · brown'],
 top:['Blue hoodie','Rust bomber jacket','Sage T-shirt','Plum collared shirt','Sand coat'],
 bottom:['Dark jeans','Sand chinos','Olive cargo shorts','Grey joggers','Denim shorts'],
 head:['Dark cropped hair','Blond side part','Brown curls','Blue cap','Plum beanie'],
 accessory:['None','Sunglasses','Wristwatch','Headphones','Ochre scarf','Chain']
};
const progression={top:[[1,0],[1,75],[2,125],[3,200],[4,350]],bottom:[[1,0],[1,50],[2,100],[3,150],[4,200]],head:[[1,0],[1,50],[2,100],[1,50],[2,150]],accessory:[[1,0],[1,75],[2,125],[3,200],[4,250],[5,350]]};
export function cosmeticCatalog(){return PARTS.flatMap(slot=>progression[slot].map(([level,price],index)=>{const value=index+(slot==='accessory'?0:1);return {id:`${slot}:${value}`,slot,value,name:PART_NAMES[slot][index],level,price};}));}
