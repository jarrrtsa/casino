# Modular character pack v01

Style: approved refined current-game SVG character. Whole-character variants and customization now share one deterministic SVG construction. Previous AI raster cutouts are not used.

Catalog:
- 5 bodies: slim/light, standard/warm, broad/olive, stocky/dark, lean/brown.
- 5 tops: blue hoodie, rust bomber, sage T-shirt, plum collared shirt, sand coat.
- 5 bottoms: dark jeans, sand chinos, olive cargo shorts, grey joggers, denim shorts.
- 5 head options: dark crop, blond side part, brown curls, blue cap, plum beanie.
- Accessories 0..5: none, sunglasses, wristwatch, headphones, ochre scarf, chain.
3750 selectable combinations. One accessory slot; combining multiple accessories is not implemented in this asset package.

All SVGs have viewBox 0 0 100 200 and transparent background. Export size 500x1000. Foot anchor (50,195), normalized (0.5,0.975), export (250,975). Fixed standing/front pose only; no walk/sit/directional frames. Existing game height can be preserved; no gameplay hitbox change implied by body width.

ASSEMBLY IS REQUIRED:
Raw part SVGs are canonical neutral-width assets, not directly stacked with arbitrary body types. Use body.width for body, upper, lower and wrist/neck accessories. Use body.head for face/headwear/head accessories. Transform about x50, never change Y.
Order: body -> lower -> face/neck -> upper -> headwear -> accessory.
parts-data.json contains exact fragments and fit values. compose-character.mjs is an isolated Node asset composition reference, not game code. Browser preview uses same formula with embedded data.
Example: composeCharacter({body:3,top:5,bottom:2,head:3,accessory:0}).
The chosen skin tone applies to all exposed body/face regions including arms and legs under short clothes. Long coat naturally covers part of shorts.
No automatic copy into public or game integration. Chat A implements actual editor/unlocks/NPC selections only on user request.

Validation:
37 SVG files XML parsed; all3750 combinations checked for defined parts/finite fit scales. Five preview selectors exercised in a mock DOM. Ten composites rendered to PNG and visually inspected, including shorts, all five widths, hats and accessories. This is not proof of all3750 combinations in the live game. Final game-size rendering/occlusion and existing seat placement should be checked by Chat A.
No glow, external image dependency or generative alpha halos. Manifest and SHA256 list supplied.
Package is standing-pose customization source, NOT an animation-ready character system. Idle/walk/sit and directional poses remain separate work.

