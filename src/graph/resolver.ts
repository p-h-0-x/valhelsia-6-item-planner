import type { Recipe } from '../types/recipe'
import type { DependencyNode, ResolutionResult } from './types'

// Recipe types that convert between variants of the same item category
// (e.g., cherry_log → oak_log, andesite → diorite). These should never
// be chosen as a "how to craft this" recipe.
const CONVERSION_RECIPE_TYPES = new Set([
  'botania:mana_infusion',
  'malum:spirit_transmutation',
  'botania:elven_trade',
])

function scoreRecipe(recipe: Recipe): number {
  let score = recipe.inputs.length

  // Penalize storage block uncrafting (1 block → 9 items)
  if (
    recipe.inputs.length === 1 &&
    recipe.outputs.length === 1 &&
    recipe.outputs[0].count === 9 &&
    recipe.type === 'minecraft:crafting_shapeless'
  ) {
    score += 100
  }

  // Heavily penalize conversion recipes (variant swaps)
  if (CONVERSION_RECIPE_TYPES.has(recipe.type)) {
    score += 200
  }

  // Penalize 1-to-1 recipes where input and output share the same base name
  // (e.g., cherry_log → oak_log, both are *_log)
  if (recipe.inputs.length === 1 && recipe.outputs.length === 1) {
    const inName = recipe.inputs[0].item.split(':')[1] ?? ''
    const outName = recipe.outputs[0].item.split(':')[1] ?? ''
    const inSuffix = inName.split('_').slice(-1)[0]
    const outSuffix = outName.split('_').slice(-1)[0]
    if (inSuffix && outSuffix && inSuffix === outSuffix && inName !== outName && !recipe.inputs[0].item.startsWith('#')) {
      score += 50
    }
  }

  // Prefer vanilla recipe types
  if (!recipe.type.startsWith('minecraft:')) score += 5

  // Slightly prefer smelting for base materials
  if (recipe.type === 'minecraft:smelting') score -= 1

  return score
}

// Recipes scoring above this are treated as if the item has no recipe (raw material)
const RAW_MATERIAL_THRESHOLD = 50

function selectBestRecipe(recipes: Recipe[]): Recipe | null {
  const best = recipes.reduce((b, r) => {
    const bScore = scoreRecipe(b)
    const rScore = scoreRecipe(r)
    return rScore < bScore ? r : b
  })
  return scoreRecipe(best) >= RAW_MATERIAL_THRESHOLD ? null : best
}

function resolveItem(
  itemId: string,
  quantity: number,
  recipesByOutput: Map<string, Recipe[]>,
  tagMap: Record<string, string[]>,
  visited: Set<string>,
  depth: number
): DependencyNode {
  // Resolve tags to concrete items
  let resolvedId = itemId
  let tagId: string | undefined
  let tagItems: string[] | undefined

  if (itemId.startsWith('#')) {
    const items = tagMap[itemId]
    if (items && items.length > 0) {
      resolvedId = items[0] // preferred (vanilla) item
      tagId = itemId
      tagItems = items
    }
  }

  if (visited.has(resolvedId)) {
    return { itemId: resolvedId, quantity, recipe: null, machine: null, children: [], depth, tagId, tagItems }
  }

  const recipes = recipesByOutput.get(resolvedId)

  if (!recipes || recipes.length === 0) {
    return { itemId: resolvedId, quantity, recipe: null, machine: null, children: [], depth, tagId, tagItems }
  }

  const recipe = selectBestRecipe(recipes)

  if (!recipe) {
    return { itemId: resolvedId, quantity, recipe: null, machine: null, children: [], depth, tagId, tagItems }
  }

  const outputItem = recipe.outputs.find((o) => o.item === resolvedId)
  const outputCount = outputItem?.count ?? 1
  const batches = Math.ceil(quantity / outputCount)

  const newVisited = new Set(visited)
  newVisited.add(resolvedId)

  const children = recipe.inputs.map((input) => {
    const inputQuantity = input.count * batches
    return resolveItem(
      input.item,
      inputQuantity,
      recipesByOutput,
      tagMap,
      newVisited,
      depth + 1
    )
  })

  return {
    itemId: resolvedId,
    quantity,
    recipe,
    machine: recipe.machine,
    children,
    depth,
    tagId,
    tagItems,
  }
}

function collectResults(node: DependencyNode): ResolutionResult {
  const rawMaterials = new Map<string, number>()
  const machines = new Set<string>()

  function walk(n: DependencyNode) {
    if (n.machine) machines.add(n.machine)

    if (n.children.length === 0) {
      const current = rawMaterials.get(n.itemId) ?? 0
      rawMaterials.set(n.itemId, current + n.quantity)
    } else {
      for (const child of n.children) walk(child)
    }
  }

  walk(node)

  return { tree: node, rawMaterials, machines }
}

export function resolveItemDependencies(
  itemId: string,
  quantity: number,
  recipesByOutput: Map<string, Recipe[]>,
  tagMap: Record<string, string[]>
): ResolutionResult {
  const tree = resolveItem(itemId, quantity, recipesByOutput, tagMap, new Set(), 0)
  return collectResults(tree)
}
