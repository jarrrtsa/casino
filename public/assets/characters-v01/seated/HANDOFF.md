# Seated modular characters v01

Same25 selectable parts + none accessory, same IDs and3750 combinations as standing pack.
Pose: seated front, arms bent with hands in lap. No chair or table baked in. No animation or side/back poses.
Canvas viewBox100x200, export500x1000. Seat anchor50,120; foot anchor50,195.
Use body.width/body.head fit about x50 exactly as standing. Order: body -> bottom -> face/neck -> top -> HANDS -> hair/hat -> accessory. Hands must draw after clothing so they remain visible.
Watch geometry changed to bent wrist; head options unchanged. Shared appearance selection is reusable between standing and seated; swap pose pack, not item IDs.
compose-character.mjs reads local parts-data.json and exports the same selection API.
Integration needs alignment of seat anchor to actual chair and table masking for lower body, without moving existing cards/player anchors. Not verified inside live game.
Validation:3750 structural compositions,37 SVG XML parsings, five preview controls, ten rendered composites visually inspected. These checks do not cover all combinations in live poker or every seat perspective.
Design reference approved by user. Seated expanded set awaits user's final review. No game code edits or integration.
