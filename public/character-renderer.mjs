import standing from './character-standing-data.mjs';
import seated from './character-seated-data.mjs';
import {normalizeAppearance} from './appearance.mjs';
export const characterParts=standing;
export function characterMarkup(selection={},pose='standing'){
  const p=pose==='seated'?seated:standing,v=normalizeAppearance(selection);
  const b=p.bases[v.body-1],t=p.tops[v.top-1],l=p.bottoms[v.bottom-1],h=p.heads[v.head-1],a=p.accessories[v.accessory];
  const fit=(svg,scale)=>`<g transform="translate(50 0) scale(${scale} 1) translate(-50 0)">${svg}</g>`;
  return fit(b.body,b.width)+fit(l.svg,b.width)+fit(b.headSvg,b.head)+fit(t.svg,b.width)+(pose==='seated'?fit(b.hands,b.width):'')+fit(h.svg,b.head)+fit(a.svg,a.fit==='body'?b.width:b.head);
}
export function drawCharacter(svg,selection={},pose='standing'){
  const key=JSON.stringify([normalizeAppearance(selection),pose]);
  if(svg.dataset.appearance===key)return;
  svg.dataset.appearance=key;svg.dataset.pose=pose;
  svg.setAttribute('viewBox','0 0 100 200');svg.setAttribute('fill','none');
  // Only packaged, trusted SVG fragments are assembled; selection values are numeric IDs.
  svg.innerHTML=characterMarkup(selection,pose);
}
