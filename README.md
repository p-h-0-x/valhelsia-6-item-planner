# Valhelsia 6 Item Planner

A web app for planning item crafting in the **Minecraft Valhelsia 6** modpack. Search through all items and enter **Plan Mode** to see a full dependency graph of resources and machines needed to craft any item.

**Live app:** https://p-h-0-x.github.io/valhelsia-6-item-planner/

## Features

- **Item search** — Browse ~15,000 items from 138 mods with fuzzy search and item sprites
- **Dependency graph** — Interactive node graph showing the full crafting tree for any item, built with React Flow
- **Recipe resolution** — Automatically picks the best crafting recipe and recursively resolves all sub-ingredients
- **Tag support** — Handles Forge/Minecraft item tags (e.g. `#minecraft:planks`) with collapsible tag nodes showing all valid variants
- **Raw materials summary** — Sidebar listing all base resources you need to gather and machines required
- **12,000+ item sprites** — Extracted directly from mod JARs with model-aware texture resolution

## Data

All data is extracted directly from mod JAR files (no in-game export needed):

| Data | Count |
|------|-------|
| Items | 14,988 |
| Recipes | 20,101 |
| Recipe types | 72 |
| Item tags | 1,957 |
| Item sprites | 12,494 |

Supported recipe types include crafting table, furnace, blast furnace, stonecutter, smithing table, and mod machines from Create, Mekanism, AE2, Botania, Ars Nouveau, PneumaticCraft, Thermal, Immersive Engineering, Farmer's Delight, and more.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** for building and dev server
- **React Flow** (`@xyflow/react`) for the interactive dependency graph
- **Dagre** for automatic graph layout
- **Tailwind CSS** for styling
- **Fuse.js** for fuzzy search

## Development

### Prerequisites

- Node.js 18+
- A local Valhelsia 6 installation (for data extraction)

### Setup

```bash
npm install
npm run dev
```

### Extracting Data

To re-extract recipe and item data from your modpack:

```bash
# Extract recipes, items, and tags from mod JARs
npm run process-data

# Extract item sprites from mod JARs
npm run extract-icons
```

By default, scripts look for the modpack at the CurseForge default path. Pass a custom path as an argument:

```bash
npx tsx scripts/extract-recipes.ts "/path/to/Valhelsia 6/mods"
npx tsx scripts/extract-icons.ts "/path/to/Valhelsia 6/mods"
```

### Building

```bash
npm run build
```

## License

This project is not affiliated with Mojang, Microsoft, or any mod authors. Item textures and recipe data belong to their respective mod authors.
