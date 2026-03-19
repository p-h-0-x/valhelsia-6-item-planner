# CLAUDE.md

## Project Overview

Valhelsia 6 Item Planner — a web app for planning Minecraft item crafting trees in the Valhelsia 6 modpack. Users search for items, and the app recursively resolves crafting dependencies into an interactive directed graph with a raw materials summary.

**Live site:** https://p-h-0-x.github.io/valhelsia-6-item-planner/

## Tech Stack

- **React 18** with TypeScript (strict mode)
- **Vite 6** — dev server and build tool
- **Tailwind CSS 3** — utility-first styling (dark theme)
- **@xyflow/react (React Flow)** — interactive node graph rendering
- **@dagrejs/dagre** — automatic hierarchical graph layout
- **Fuse.js** — fuzzy item search

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # TypeScript check (tsc -b) + Vite production build
npm run preview        # Preview production build locally
npm run process-data   # Extract recipes/items/tags from mod JARs (npx tsx scripts/extract-recipes.ts)
npm run extract-icons  # Extract item sprites from mod JARs (npx tsx scripts/extract-icons.ts)
```

There are no test or lint commands configured. The build command (`npm run build`) runs `tsc -b` which enforces TypeScript strict checks.

## Project Structure

```
src/
├── main.tsx                    # React 18 entry point (StrictMode)
├── index.css                   # Tailwind directives + dark theme base styles
├── vite-env.d.ts               # Vite type declarations
├── components/
│   ├── App.tsx                 # Root component — data loading, state, layout
│   ├── SearchBar.tsx           # Fuzzy search dropdown with keyboard navigation
│   ├── PlanView.tsx            # Graph + sidebar container
│   ├── GraphView.tsx           # React Flow wrapper with Dagre layout
│   ├── Sidebar.tsx             # Raw materials and machines summary
│   ├── ItemIcon.tsx            # Item icon renderer with mod color coding
│   └── nodes/
│       ├── CraftedItemNode.tsx # Purple-bordered crafted item node
│       ├── RawMaterialNode.tsx # Green-bordered raw material node
│       └── TagNode.tsx         # Cyan-bordered expandable tag node
├── data/
│   ├── loader.ts               # Loads JSON data files, builds lookup maps
│   ├── search-index.ts         # Fuse.js search configuration
│   └── icon-context.tsx        # React Context for icon path lookup
├── graph/
│   ├── types.ts                # DependencyNode, ResolutionResult interfaces
│   ├── resolver.ts             # Core recursive dependency resolution algorithm
│   └── layout.ts               # Dependency tree → React Flow nodes/edges + Dagre layout
└── types/
    ├── item.ts                 # Item interface (id, name, mod, icon, tags)
    └── recipe.ts               # Recipe interfaces, RECIPE_TYPE_TO_MACHINE mapping
scripts/
├── extract-recipes.ts          # Extract recipes/items/tags from mod JAR files
└── extract-icons.ts            # Extract PNG sprites from mod JAR files
public/
├── data/                       # Pre-processed JSON (items, recipes, tags, icon-index)
└── icons/                      # 12,494 item sprites organized by mod namespace
```

## Architecture

### Data Flow

1. `loader.ts` loads four JSON files at startup: `items.json`, `recipes.json`, `tags.json`, `icon-index.json`
2. Builds lookup maps: `itemMap` (by ID), `recipesByOutput` (recipes keyed by output item), `tagMap` (tag → item list)
3. User selects an item via fuzzy search
4. `resolver.ts` recursively resolves the crafting dependency tree
5. `layout.ts` converts the tree into React Flow nodes/edges with Dagre layout
6. `GraphView.tsx` renders the interactive graph; `Sidebar.tsx` shows raw materials

### Dependency Resolution (`src/graph/resolver.ts`)

This is the core algorithm. Key functions:
- `scoreRecipe()` — scores recipes with penalties for conversions, uncrafting, and variant types (score < 50 threshold)
- `selectBestRecipe()` — picks the best-scoring recipe
- `resolveItem()` — recursive traversal with visited set for cycle prevention
- `resolveItemDependencies()` — public entry point

### Three Node Types in the Graph

| Node Type | Border Color | Purpose |
|-----------|-------------|---------|
| CraftedItemNode | Purple | Items with crafting recipes |
| RawMaterialNode | Green | Base items with no recipe |
| TagNode | Cyan | Item tag groups (expandable to show variants) |

## Conventions

### Naming

- **Components:** PascalCase (`.tsx` files)
- **Functions/variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE (e.g., `CONVERSION_RECIPE_TYPES`, `RAW_MATERIAL_THRESHOLD`)
- **Minecraft item IDs:** `namespace:item_name` format (e.g., `minecraft:oak_planks`)

### TypeScript

- Strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Interfaces preferred for data types (see `src/types/`)
- No `any` usage — types are well-defined

### Styling

- Tailwind utility classes exclusively (no CSS modules or styled-components)
- Dark theme: backgrounds `#1a1a2e` / gray-800/900, text `#e0e0e0`
- Mod-specific colors for icons: minecraft=green, create=gold, mekanism=cyan, botania=purple, etc.

### React Patterns

- No state management library — useState + Context API only
- `IconIndexProvider` context for icon path lookups (`useIconPath()` hook)
- Debounced search input (150ms)
- Functional components with hooks throughout (no class components)

## Deployment

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers on push to `main` branch
- Runs `npm ci` → `npm run build` → deploys `./dist`
- Base URL: `/valhelsia-6-item-planner/` (configured in `vite.config.ts`)

## Data Extraction

The `scripts/` directory contains tools to extract game data from Minecraft mod JAR files. These are run manually when updating game data — they require local mod files and are not part of CI.

- `extract-recipes.ts` — reads recipe JSONs from JARs, outputs `items.json`, `recipes.json`, `tags.json`
- `extract-icons.ts` — extracts PNG textures from JARs, outputs sprites + `icon-index.json`

Default paths are hardcoded for the maintainer's local setup; override via CLI argument.

## Key Data Statistics

- 14,988 items, 20,101 recipes, 72 recipe types, 1,957 item tags, 12,494 sprites
- Data files in `public/data/` total ~7.2MB
