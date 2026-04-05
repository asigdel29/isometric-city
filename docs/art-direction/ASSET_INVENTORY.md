# IsoCity asset inventory (reskin)

## Chroma key

- Sprite sheets use **solid red `#FF0000`** as the transparent background. The runtime strips red in [`src/app/page.tsx`](../../src/app/page.tsx) (`filterBackgroundColor`) and [`src/components/game/imageLoader.ts`](../../src/components/game/imageLoader.ts).
- **Do not** change the chroma color without updating the filter threshold (`COLOR_THRESHOLD`, `BACKGROUND_COLOR`).

## Authoritative config

- [`src/lib/renderConfig.ts`](../../src/lib/renderConfig.ts): `SpritePack` entries (`src`, `cols`, `rows`, `spriteOrder`, `buildingToSprite`, offsets, variant sheets).
- Default pack id: `sprites4` (display name **Village Theme**). Alternate packs: `harry`, `china` (see same file).

## Primary PNG sheets (IsoCity)

| Role | Path pattern |
|------|----------------|
| Main buildings | `/assets/sprites_red_water_new.png` (+ construction, abandoned, dense, modern) |
| Parks | `/assets/sprites_red_water_new_parks*.png` |
| Farms | `/assets/sprites_red_water_new_farm.png` |
| Shops | `/assets/sprites_red_water_new_shops.png` |
| Stations | `/assets/sprites_red_water_new_stations.png` |
| Services | `/assets/sprites_red_water_new_services*.png` |
| Infrastructure | `/assets/sprites_red_water_new_services-2.png` |
| Mansions | `/assets/mansion_alternates.png` |
| Planes | `/assets/sprites_red_water_new_planes*.png` |

## Other raster assets

- **Water / terrain**: `/assets/water*.webp`, `sprites_red_water_new.webp` (see [`src/app/layout.tsx`](../../src/app/layout.tsx) preloads).
- **Ages / thumbnails**: `/assets/ages/*.webp`, `/assets/buildings/*.png`.
- **Coaster** (separate game): `/assets/coaster/*`.

## WebP pipeline

- `npm run compress-images` generates `.webp` next to `.png` under `public/assets`; loaders prefer WebP when present.

## Current visual pass (village reskin)

- **Canvas**: global warm grade via `.game-canvas-filter` wrapping [`CanvasIsometricGrid`](../../src/components/game/CanvasIsometricGrid.tsx) in [`Game.tsx`](../../src/components/Game.tsx) (sepia / saturation / hue — no layout change).
- **Full hand-painted replacements**: regenerate PNGs **in-place** with the same dimensions and grid positions, then run `compress-images`. Update `renderConfig` only if sheet layout or mappings change.

## Style reference

- [`reference-village-assets.png`](./reference-village-assets.png) (repo copy: [`/public/branding/style-reference.png`](../../public/branding/style-reference.png)).
