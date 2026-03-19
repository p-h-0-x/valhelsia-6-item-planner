/**
 * Reconstructs approximate crafting grid patterns for recipes that lack them.
 * Since the original grid positions were not stored during extraction,
 * this creates best-effort layouts:
 * - Shaped recipes: items laid out sequentially in a grid matching typical Minecraft patterns
 * - Shapeless recipes: items arranged left-to-right, top-to-bottom in rows of 3
 *
 * Usage: npx tsx scripts/add-patterns.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RECIPES_PATH = path.resolve(__dirname, '..', 'public', 'data', 'recipes.json')

interface RecipeIngredient {
  item: string
  count: number
}

interface Recipe {
  id: string
  type: string
  machine: string
  inputs: RecipeIngredient[]
  outputs: RecipeIngredient[]
  pattern?: (string | null)[][]
}

function buildGridFromInputs(inputs: RecipeIngredient[]): (string | null)[][] {
  // Expand inputs into individual slots
  const slots: (string | null)[] = []
  for (const input of inputs) {
    for (let i = 0; i < input.count; i++) {
      slots.push(input.item)
    }
  }

  // Determine grid size
  const total = slots.length
  let cols: number
  let rows: number

  if (total <= 1) {
    cols = 1
    rows = 1
  } else if (total <= 2) {
    cols = 2
    rows = 1
  } else if (total <= 4) {
    cols = 2
    rows = 2
  } else if (total <= 6) {
    cols = 3
    rows = 2
  } else {
    cols = 3
    rows = 3
  }

  const grid: (string | null)[][] = []
  for (let r = 0; r < rows; r++) {
    const row: (string | null)[] = []
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      row.push(idx < slots.length ? slots[idx] : null)
    }
    grid.push(row)
  }

  return grid
}

function main() {
  console.log(`Reading recipes from: ${RECIPES_PATH}`)
  const recipes: Recipe[] = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf-8'))

  let shapedCount = 0
  let shapelessCount = 0
  let alreadyHasPattern = 0

  for (const recipe of recipes) {
    if (recipe.pattern) {
      alreadyHasPattern++
      continue
    }

    if (recipe.type === 'minecraft:crafting_shaped') {
      recipe.pattern = buildGridFromInputs(recipe.inputs)
      shapedCount++
    } else if (recipe.type === 'minecraft:crafting_shapeless') {
      recipe.pattern = buildGridFromInputs(recipe.inputs)
      shapelessCount++
    }
  }

  console.log(`Already had pattern: ${alreadyHasPattern}`)
  console.log(`Added pattern to ${shapedCount} shaped recipes`)
  console.log(`Added pattern to ${shapelessCount} shapeless recipes`)

  fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes))
  console.log(`Wrote updated recipes to: ${RECIPES_PATH}`)
}

main()
