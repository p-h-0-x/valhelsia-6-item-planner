import type { Recipe } from '../types/recipe'
import type { DependencyNode, ResolutionResult } from './types'

// Recipe types that ALWAYS convert between variants of the same item category
// (e.g., cherry_log → oak_log, andesite → diorite). These should never
// be chosen as a "how to craft this" recipe.
const CONVERSION_RECIPE_TYPES = new Set([
  'malum:spirit_transmutation',
  'botania:elven_trade',
])

// Recipe types where SOME recipes are conversions and others are legitimate
// crafting progressions. Only penalize when input and output share a namespace
// (e.g., minecraft:andesite → minecraft:diorite is a conversion, but
// minecraft:iron_ingot → botania:manasteel_ingot is a progression).
const MIXED_CONVERSION_RECIPE_TYPES = new Set([
  'botania:mana_infusion',
])

function scoreRecipe(recipe: Recipe): number {
  let score = recipe.inputs.length

  // Penalize storage block uncrafting (1 block → 9 items),
  // but not ingot-to-nugget recipes which are legitimate crafting
  const outputName = recipe.outputs[0]?.item.split(':')[1] ?? ''
  if (
    recipe.inputs.length === 1 &&
    recipe.outputs.length === 1 &&
    recipe.outputs[0].count === 9 &&
    recipe.type === 'minecraft:crafting_shapeless' &&
    !outputName.endsWith('_nugget')
  ) {
    score += 100
  }

  // Penalize storage packing recipes (9 nuggets → 1 ingot, 9 ingots → 1 block).
  // These are reconstruction recipes, not real crafting progressions.
  if (
    recipe.inputs.length === 1 &&
    recipe.outputs.length === 1 &&
    recipe.inputs[0].count === 9 &&
    recipe.outputs[0].count === 1 &&
    recipe.type === 'minecraft:crafting_shaped'
  ) {
    score += 100
  }

  // Heavily penalize conversion recipes (variant swaps)
  if (CONVERSION_RECIPE_TYPES.has(recipe.type)) {
    score += 200
  }

  // For mixed recipe types, only penalize same-namespace conversions
  if (MIXED_CONVERSION_RECIPE_TYPES.has(recipe.type) && recipe.inputs.length === 1) {
    const inNs = recipe.inputs[0].item.split(':')[0]
    const outNs = recipe.outputs[0]?.item.split(':')[0]
    if (inNs === outNs) {
      score += 200
    }
  }

  // Penalize 1-to-1 recipes where input and output share the same base name
  // and namespace (e.g., minecraft:cherry_log → minecraft:oak_log, both are *_log).
  // Cross-namespace recipes (e.g., minecraft:iron_ingot → botania:manasteel_ingot)
  // are legitimate crafting progressions and should not be penalized.
  if (recipe.inputs.length === 1 && recipe.outputs.length === 1) {
    const inputId = recipe.inputs[0].item
    const outputId = recipe.outputs[0].item
    const inNs = inputId.split(':')[0]
    const outNs = outputId.split(':')[0]
    const inName = inputId.split(':')[1] ?? ''
    const outName = outputId.split(':')[1] ?? ''
    const inSuffix = inName.split('_').slice(-1)[0]
    const outSuffix = outName.split('_').slice(-1)[0]
    if (inSuffix && outSuffix && inSuffix === outSuffix && inName !== outName && inNs === outNs && !inputId.startsWith('#')) {
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
