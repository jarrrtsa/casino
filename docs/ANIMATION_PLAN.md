# Animation plan – incremental rollout

Status: proposal, not implemented. Keep all current world, foot, seat, card and player anchors. No push or deploy.

## 1. Cards and poker feedback — Chat A

Use existing SVG/CSS cards. Deal from a shared deck point to each established card position, stagger 70–100 ms, duration 180–250 ms. Reveal community cards with a short flip; reveal private cards only after the server sends them. Mark animations by hand number + card identity + destination so polling/reconnect does not replay a deal. Handle cancelled hands and navigation by cancelling pending animations. Never delay buttons or server actions for animation.

Add a brief active-player border and a small chip/bet movement when the authoritative bet changes. Move winnings only after the server settles the hand. Keep layout dimensions fixed. First acceptance: a full hand, reconnect mid-hand, next hand and reduced motion show correct cards with no duplicate effects.

## 2. Environment atmosphere — Chat C assets, Chat A integration

Start with lvl 0 barrel fire: C prepares a transparent flame loop as a separate asset, approved one asset at a time before integration. Agree canvas size, placement anchor, frame size/count, FPS and loop seam. Do not animate the full approved background or offset its layers. Follow with subtle rain and distant water reflections; lvl 1 lamp movement and dust come later. Each effect has its own approval and handoff; existing images remain unchanged.

Prefer a few small looping overlays over large animated background files. Pause on hidden tabs, stop effects outside the active environment and provide an effects toggle. Check foreground occlusion, both camera extremes and low-height windows.

## 3. Character idle — Chat C

Create a subtle standing breathing/blink loop first, then a separate seated idle loop. Approve a reference clip before expanding the set. Preserve standing foot anchor (50,195) and seated contact (50,120), viewBox 100×200, body-specific width/head fit and all selection IDs. Keep the layers modular, including seated hands above clothing. Test widest/narrowest bodies, shorts, coat, hats, glasses and headphones before completing the pack.

Do not move the whole character up/down to imitate breathing: feet and seat contact must stay fixed. The still frame remains the fallback. Do not introduce side/back poses from front-facing art.

## 4. Walk cycle — Chat C then Chat A

Agree directions and frame budget with the user before drawing. Begin with one approved standing outfit/body and a short cycle, then expand only after modular fit has been checked. Horizontal movement and the limited depth movement use existing gameplay rules. Play walk only when validated position actually changes; stop against obstacles and on focus loss. Remotes derive motion from interpolated positions, not untrusted animation commands. No changes to collision geometry or speed.

## Shared acceptance

Reduced motion disables flips, travel and idle motion while keeping instantaneous readable state changes. Effects can be disabled independently. No animation changes wallet, XP, turn deadline, hidden information or network truth. Test resizing, tab visibility, modal dialogs, reconnect and environment changes. Do not autoplay sound: audio gets a separate approval and volume/mute design.

Suggested order: cards → one fire loop → standing idle → seated idle → walking → other environment effects. C keeps preparing and approving one asset at a time in design-staging; A integrates only a user-approved handoff.
`nUpdate 16 October 2026: first lightweight effects implemented with existing code/SVG: anchored breathing, atmospheric light/particles, card entry/reveal and growing pot chips. These do not replace the planned separate flame, blink or walk animation asset work. Reduced motion and effects toggles apply; hidden tabs pause ambient loops.
