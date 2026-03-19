// Extract recipe and item data from Valhelsia 6 mod JARs.
// Reads JARs as ZIP files using yauzl, extracts recipe JSONs at:
//   data/<namespace>/recipes/<name>.json
//
// Usage: npx tsx scripts/extract-recipes.ts ["<path-to-mods-folder>"]

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import yauzl from 'yauzl'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MODS_DIR =
  process.argv[2] ||
  'c:/Users/benja/curseforge/minecraft/Instances/Valhelsia 6/mods'

const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'data')

// Recipe type → machine mapping
const RECIPE_TYPE_TO_MACHINE: Record<string, string> = {
  'minecraft:crafting_shaped': 'minecraft:crafting_table',
  'minecraft:crafting_shapeless': 'minecraft:crafting_table',
  'minecraft:smelting': 'minecraft:furnace',
  'minecraft:blasting': 'minecraft:blast_furnace',
  'minecraft:smoking': 'minecraft:smoker',
  'minecraft:stonecutting': 'minecraft:stonecutter',
  'minecraft:smithing_transform': 'minecraft:smithing_table',
  'minecraft:smithing_trim': 'minecraft:smithing_table',
  'minecraft:campfire_cooking': 'minecraft:campfire',
  'create:pressing': 'create:mechanical_press',
  'create:mixing': 'create:mechanical_mixer',
  'create:crushing': 'create:crushing_wheel',
  'create:milling': 'create:millstone',
  'create:compacting': 'create:mechanical_press',
  'create:cutting': 'create:mechanical_saw',
  'create:deploying': 'create:deployer',
  'create:filling': 'create:spout',
  'create:haunting': 'create:encased_fan',
  'create:splashing': 'create:encased_fan',
  'create:sandpaper_polishing': 'create:sandpaper',
  'create:sequenced_assembly': 'create:sequenced_assembly',
  'create:mechanical_crafting': 'create:mechanical_crafter',
  'mekanism:crushing': 'mekanism:crusher',
  'mekanism:enriching': 'mekanism:enrichment_chamber',
  'mekanism:combining': 'mekanism:combiner',
  'mekanism:infusing': 'mekanism:metallurgic_infuser',
  'mekanism:sawing': 'mekanism:precision_sawmill',
  'mekanism:chemical_infusing': 'mekanism:chemical_infuser',
  'mekanism:dissolving': 'mekanism:chemical_dissolution_chamber',
  'mekanism:separating': 'mekanism:electrolytic_separator',
  'mekanism:purifying': 'mekanism:purification_chamber',
  'mekanism:injecting': 'mekanism:chemical_injection_chamber',
  'mekanism:compressing': 'mekanism:osmium_compressor',
  'mekanism:activating': 'mekanism:solar_neutron_activator',
  'mekanism:centrifuging': 'mekanism:isotopic_centrifuge',
  'mekanism:crystallizing': 'mekanism:chemical_crystallizer',
  'mekanism:oxidizing': 'mekanism:chemical_oxidizer',
  'mekanism:washing': 'mekanism:chemical_washer',
  'mekanism:energy_conversion': 'mekanism:energy_conversion',
  'mekanism:rotary': 'mekanism:rotary_condensentrator',
  'ae2:inscriber': 'ae2:inscriber',
  'ae2:transform': 'ae2:charger',
  'botania:mana_infusion': 'botania:mana_pool',
  'botania:petal_apothecary': 'botania:petal_apothecary',
  'botania:runic_altar': 'botania:runic_altar',
  'botania:elven_trade': 'botania:alfheim_portal',
  'botania:terra_plate': 'botania:terra_plate',
  'botania:brew': 'botania:brewery',
  'ars_nouveau:enchanting_apparatus': 'ars_nouveau:enchanting_apparatus',
  'ars_nouveau:imbuement': 'ars_nouveau:imbuement_chamber',
  'ars_nouveau:glyph': 'ars_nouveau:scribes_table',
  'pneumaticcraft:thermo_plant': 'pneumaticcraft:thermopneumatic_processing_plant',
  'pneumaticcraft:pressure_chamber': 'pneumaticcraft:pressure_chamber',
  'pneumaticcraft:assembly': 'pneumaticcraft:assembly_controller',
  'pneumaticcraft:refinery': 'pneumaticcraft:refinery',
  'pneumaticcraft:explosion_crafting': 'pneumaticcraft:explosion',
  'pneumaticcraft:heat_frame_cooling': 'pneumaticcraft:heat_frame',
  'farmersdelight:cooking': 'farmersdelight:cooking_pot',
  'farmersdelight:cutting': 'farmersdelight:cutting_board',
  'thermal:smelter': 'thermal:induction_smelter',
  'thermal:sawmill': 'thermal:sawmill',
  'thermal:pulverizer': 'thermal:pulverizer',
  'thermal:centrifuge': 'thermal:centrifugal_separator',
  'thermal:press': 'thermal:multiservo_press',
  'thermal:crucible': 'thermal:magma_crucible',
  'thermal:chiller': 'thermal:blast_chiller',
  'thermal:refinery': 'thermal:fractionating_still',
  'thermal:bottler': 'thermal:fluid_encapsulator',
  'thermal:insolator': 'thermal:phytogenic_insolator',
}

// ── Ingredient / recipe parsing ─────────────────────────────────────

interface NormalizedIngredient {
  item: string
  count: number
}

interface NormalizedRecipe {
  id: string
  type: string
  machine: string
  inputs: NormalizedIngredient[]
  outputs: NormalizedIngredient[]
  pattern?: (string | null)[][]
}

interface NormalizedItem {
  id: string
  name: string
  mod: string
}

function extractItemId(ingredient: unknown): string | null {
  if (!ingredient || typeof ingredient !== 'object') return null
  const ing = ingredient as Record<string, unknown>
  if (typeof ing.item === 'string') return ing.item
  if (typeof ing.tag === 'string') return `#${ing.tag}`
  if (Array.isArray(ingredient) && ingredient.length > 0)
    return extractItemId(ingredient[0])
  return null
}

function parseShapedPattern(recipe: Record<string, unknown>): (string | null)[][] | undefined {
  const pattern = recipe.pattern as string[] | undefined
  const key = recipe.key as Record<string, unknown> | undefined
  if (!pattern || !key) return undefined

  return pattern.map((row) =>
    Array.from(row).map((ch) => {
      if (ch === ' ') return null
      const keyValue = key[ch]
      if (!keyValue) return null
      return extractItemId(keyValue)
    })
  )
}

function parseShapedIngredients(recipe: Record<string, unknown>): NormalizedIngredient[] {
  const pattern = recipe.pattern as string[] | undefined
  const key = recipe.key as Record<string, unknown> | undefined
  if (!pattern || !key) return []

  const counts = new Map<string, number>()
  for (const row of pattern) {
    for (const ch of row) {
      if (ch !== ' ') counts.set(ch, (counts.get(ch) ?? 0) + 1)
    }
  }

  const ingredients: NormalizedIngredient[] = []
  for (const [ch, count] of counts) {
    const keyValue = key[ch]
    if (!keyValue) continue
    const itemId = extractItemId(keyValue)
    if (itemId) ingredients.push({ item: itemId, count })
  }
  return ingredients
}

function parseShapelessIngredients(recipe: Record<string, unknown>): NormalizedIngredient[] {
  const ingredients = recipe.ingredients as unknown[] | undefined
  if (!ingredients) return []

  const counts = new Map<string, number>()
  for (const ing of ingredients) {
    const itemId = extractItemId(ing)
    if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
  }
  return Array.from(counts).map(([item, count]) => ({ item, count }))
}

function parseShapelessPattern(recipe: Record<string, unknown>): (string | null)[][] | undefined {
  const ingredients = recipe.ingredients as unknown[] | undefined
  if (!ingredients) return undefined

  const items: (string | null)[] = ingredients.map((ing) => extractItemId(ing))
  const cols = Math.min(items.length, 3)
  const rows = Math.ceil(items.length / 3)
  const grid: (string | null)[][] = []
  for (let r = 0; r < rows; r++) {
    const row: (string | null)[] = []
    for (let c = 0; c < cols; c++) {
      const idx = r * 3 + c
      row.push(idx < items.length ? items[idx] : null)
    }
    grid.push(row)
  }
  return grid
}

function parseResult(result: unknown): NormalizedIngredient | null {
  if (!result) return null
  if (typeof result === 'string') return { item: result, count: 1 }
  if (typeof result !== 'object') return null
  const res = result as Record<string, unknown>
  if (typeof res.item === 'string')
    return { item: res.item, count: (res.count as number) ?? 1 }
  if (typeof res.id === 'string')
    return { item: res.id, count: (res.count as number) ?? 1 }
  return null
}

function parseGenericInputs(recipe: Record<string, unknown>): NormalizedIngredient[] {
  const ingredients: NormalizedIngredient[] = []

  // Try "ingredients" — can be an array or an object with named slots (e.g. ae2:inscriber {top, middle, bottom})
  const ingsRaw = recipe.ingredients
  if (Array.isArray(ingsRaw)) {
    const counts = new Map<string, number>()
    for (const ing of ingsRaw) {
      const itemId = extractItemId(ing)
      if (itemId) {
        const ingObj = ing as Record<string, unknown>
        const count = (ingObj.count as number) ?? 1
        counts.set(itemId, (counts.get(itemId) ?? 0) + count)
      }
    }
    for (const [item, count] of counts) ingredients.push({ item, count })
  } else if (ingsRaw && typeof ingsRaw === 'object' && !Array.isArray(ingsRaw)) {
    // Named-slot ingredients (e.g. { top: {...}, middle: {...}, bottom: {...} })
    const counts = new Map<string, number>()
    for (const slot of Object.values(ingsRaw as Record<string, unknown>)) {
      const itemId = extractItemId(slot)
      if (itemId) {
        const ingObj = slot as Record<string, unknown>
        const count = (ingObj.count as number) ?? 1
        counts.set(itemId, (counts.get(itemId) ?? 0) + count)
      }
    }
    for (const [item, count] of counts) ingredients.push({ item, count })
  }

  // Try "input" (can be single object or array)
  if (ingredients.length === 0 && recipe.input) {
    if (Array.isArray(recipe.input)) {
      const counts = new Map<string, number>()
      for (const ing of recipe.input as unknown[]) {
        const itemId = extractItemId(ing)
        if (itemId) {
          const ingObj = ing as Record<string, unknown>
          const count = (ingObj.count as number) ?? 1
          counts.set(itemId, (counts.get(itemId) ?? 0) + count)
        }
      }
      for (const [item, count] of counts) ingredients.push({ item, count })
    } else {
      const itemId = extractItemId(recipe.input)
      if (itemId) {
        const ingObj = recipe.input as Record<string, unknown>
        ingredients.push({ item: itemId, count: (ingObj.count as number) ?? 1 })
      }
    }
  }

  // Try "ingredient" (single object)
  if (ingredients.length === 0 && recipe.ingredient) {
    const itemId = extractItemId(recipe.ingredient)
    if (itemId) {
      const ingObj = recipe.ingredient as Record<string, unknown>
      ingredients.push({ item: itemId, count: (ingObj.count as number) ?? 1 })
    }
  }
  return ingredients
}

function parseGenericOutputs(recipe: Record<string, unknown>): NormalizedIngredient[] {
  const outputs: NormalizedIngredient[] = []
  if (recipe.result) {
    const res = parseResult(recipe.result)
    if (res) outputs.push(res)
  }
  if (Array.isArray(recipe.results)) {
    for (const r of recipe.results) {
      const res = parseResult(r)
      if (res) outputs.push(res)
    }
  }
  if (outputs.length === 0 && recipe.output) {
    const res = parseResult(recipe.output)
    if (res) outputs.push(res)
  }
  return outputs
}

function normalizeRecipe(recipeId: string, raw: Record<string, unknown>): NormalizedRecipe | null {
  const type = raw.type as string | undefined
  if (!type) return null

  let inputs: NormalizedIngredient[]
  let outputs: NormalizedIngredient[]
  let pattern: (string | null)[][] | undefined

  if (type === 'minecraft:crafting_shaped') {
    inputs = parseShapedIngredients(raw)
    outputs = parseGenericOutputs(raw)
    pattern = parseShapedPattern(raw)
  } else if (type === 'minecraft:crafting_shapeless') {
    inputs = parseShapelessIngredients(raw)
    outputs = parseGenericOutputs(raw)
    pattern = parseShapelessPattern(raw)
  } else if (type === 'minecraft:smithing_transform') {
    const base = extractItemId(raw.base)
    const addition = extractItemId(raw.addition)
    const template = extractItemId(raw.template)
    inputs = []
    if (base) inputs.push({ item: base, count: 1 })
    if (addition) inputs.push({ item: addition, count: 1 })
    if (template) inputs.push({ item: template, count: 1 })
    outputs = parseGenericOutputs(raw)
  } else {
    inputs = parseGenericInputs(raw)
    outputs = parseGenericOutputs(raw)
  }

  if (inputs.length === 0 || outputs.length === 0) return null

  const machine = RECIPE_TYPE_TO_MACHINE[type] ?? type

  const result: NormalizedRecipe = { id: recipeId, type, machine, inputs, outputs }
  if (pattern) result.pattern = pattern
  return result
}

function itemIdToName(id: string): string {
  if (id.startsWith('#')) {
    const parts = id.split('/')
    return parts[parts.length - 1].replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  const name = id.split(':')[1] ?? id
  return name.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── ZIP reading with yauzl ──────────────────────────────────────────

const RECIPE_PATH_RE = /^data\/([^/]+)\/recipes\/(.+\.json)$/
const TAG_PATH_RE = /^data\/([^/]+)\/tags\/items\/(.+\.json)$/

interface JarContents {
  recipes: { id: string; data: Record<string, unknown> }[]
  tags: { id: string; values: unknown[] }[]
}

function readJarContents(jarPath: string): Promise<JarContents> {
  return new Promise((resolve, reject) => {
    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err)

      const recipes: JarContents['recipes'] = []
      const tags: JarContents['tags'] = []

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        const recipeMatch = RECIPE_PATH_RE.exec(entry.fileName)
        const tagMatch = TAG_PATH_RE.exec(entry.fileName)

        if (!recipeMatch && !tagMatch) {
          zipfile.readEntry()
          return
        }

        zipfile.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) {
            zipfile.readEntry()
            return
          }

          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            try {
              const content = Buffer.concat(chunks).toString('utf-8')
              const data = JSON.parse(content)

              if (recipeMatch) {
                const namespace = recipeMatch[1]
                const recipePath = recipeMatch[2].replace('.json', '')
                recipes.push({ id: `${namespace}:${recipePath}`, data })
              } else if (tagMatch) {
                const namespace = tagMatch[1]
                const tagPath = tagMatch[2].replace('.json', '')
                const tagId = `#${namespace}:${tagPath}`
                if (Array.isArray(data.values)) {
                  tags.push({ id: tagId, values: data.values })
                }
              }
            } catch {
              // skip invalid JSON
            }
            zipfile.readEntry()
          })
        })
      })

      zipfile.on('end', () => resolve({ recipes, tags }))
      zipfile.on('error', reject)
    })
  })
}

// ── Main ────────────────────────────────────────────────────────────

// Also extract vanilla Minecraft recipes from the client JAR
const VANILLA_JAR = 'c:/Users/benja/curseforge/minecraft/Install/versions/1.20.1/1.20.1.jar'
const FORGE_JAR = 'c:/Users/benja/curseforge/minecraft/Install/libraries/net/minecraftforge/forge/1.20.1-47.4.0/forge-1.20.1-47.4.0-universal.jar'

async function main() {
  console.log(`Reading mod JARs from: ${MODS_DIR}`)

  const jarFiles = fs.readdirSync(MODS_DIR).filter((f) => f.endsWith('.jar'))

  // Add vanilla + Forge JARs first (so their tags get priority)
  const allJarPaths: string[] = []
  if (fs.existsSync(FORGE_JAR)) {
    allJarPaths.push(FORGE_JAR)
    console.log('Including Forge JAR')
  }
  if (fs.existsSync(VANILLA_JAR)) {
    allJarPaths.push(VANILLA_JAR)
    console.log('Including vanilla Minecraft JAR')
  }
  for (const jar of jarFiles) {
    allJarPaths.push(path.join(MODS_DIR, jar))
  }
  console.log(`Found ${allJarPaths.length} JARs to process`)

  const allRecipes: NormalizedRecipe[] = []
  const allItemIds = new Set<string>()
  let skipped = 0
  let processedJars = 0
  const recipeTypes = new Map<string, number>()

  // Tag map: #namespace:path → list of concrete item IDs
  const tagMap = new Map<string, string[]>()

  for (const jarPath of allJarPaths) {
    try {
      const { recipes: rawRecipes, tags: rawTags } = await readJarContents(jarPath)

      if (rawRecipes.length > 0) {
        processedJars++
      }

      // Merge tags
      for (const { id, values } of rawTags) {
        const existing = tagMap.get(id) ?? []
        for (const v of values) {
          // Values can be strings ("minecraft:oak_planks") or objects with "id" field
          let itemId: string | null = null
          if (typeof v === 'string') {
            itemId = v
          } else if (v && typeof v === 'object' && 'id' in v) {
            itemId = (v as { id: string }).id
          }
          // Skip nested tag references (start with #)
          if (itemId && !itemId.startsWith('#') && !existing.includes(itemId)) {
            existing.push(itemId)
          }
        }
        tagMap.set(id, existing)
      }

      for (const { id, data } of rawRecipes) {
        const recipe = normalizeRecipe(id, data)
        if (recipe) {
          allRecipes.push(recipe)
          recipeTypes.set(recipe.type, (recipeTypes.get(recipe.type) ?? 0) + 1)
          for (const inp of recipe.inputs) allItemIds.add(inp.item)
          for (const out of recipe.outputs) allItemIds.add(out.item)
          if (recipe.machine) allItemIds.add(recipe.machine)
        } else {
          skipped++
        }
      }
    } catch {
      // JAR might be corrupted or unreadable
    }
  }

  console.log(`\nProcessed ${processedJars} JARs with recipes`)
  console.log(`Extracted ${allRecipes.length} recipes (skipped ${skipped})`)
  console.log(`Found ${allItemIds.size} unique items`)
  console.log(`Extracted ${tagMap.size} item tags`)

  console.log(`\nTop recipe types:`)
  const sortedTypes = Array.from(recipeTypes.entries()).sort((a, b) => b[1] - a[1])
  for (const [type, count] of sortedTypes.slice(0, 30)) {
    console.log(`  ${type}: ${count}`)
  }

  // Build item list
  const items: NormalizedItem[] = Array.from(allItemIds)
    .sort()
    .map((id) => ({
      id,
      name: itemIdToName(id),
      mod: id.startsWith('#') ? 'tag' : id.split(':')[0] ?? 'minecraft',
    }))

  // Build tag resolution map: tag → item list (preferred item first)
  const tagResolution: Record<string, string[]> = {}
  for (const [tag, itemIds] of tagMap) {
    if (itemIds.length === 0) continue
    // Put vanilla items first
    const sorted = [...itemIds].sort((a, b) => {
      const aVanilla = a.startsWith('minecraft:') ? 0 : 1
      const bVanilla = b.startsWith('minecraft:') ? 0 : 1
      return aVanilla - bVanilla
    })
    tagResolution[tag] = sorted
  }

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  fs.writeFileSync(path.join(OUTPUT_DIR, 'items.json'), JSON.stringify(items))
  console.log(`\nWrote ${items.length} items to items.json`)

  fs.writeFileSync(path.join(OUTPUT_DIR, 'recipes.json'), JSON.stringify(allRecipes))
  console.log(`Wrote ${allRecipes.length} recipes to recipes.json`)

  fs.writeFileSync(path.join(OUTPUT_DIR, 'tags.json'), JSON.stringify(tagResolution))
  console.log(`Wrote ${Object.keys(tagResolution).length} tag resolutions to tags.json`)

  console.log('\nDone!')
}

main().catch(console.error)
