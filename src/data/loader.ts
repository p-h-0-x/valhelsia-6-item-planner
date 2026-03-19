import type { Item } from '../types/item'
import type { Recipe } from '../types/recipe'

export interface AppData {
  items: Item[]
  itemMap: Map<string, Item>
  recipes: Recipe[]
  recipesByOutput: Map<string, Recipe[]>
  iconIndex: Record<string, string>
  tagMap: Record<string, string[]>
}

export async function loadData(): Promise<AppData> {
  const base = import.meta.env.BASE_URL

  const [itemsRes, recipesRes, iconIndexRes, tagsRes] = await Promise.all([
    fetch(`${base}data/items.json`),
    fetch(`${base}data/recipes.json`),
    fetch(`${base}data/icon-index.json`),
    fetch(`${base}data/tags.json`),
  ])

  const items: Item[] = await itemsRes.json()
  const recipes: Recipe[] = await recipesRes.json()
  const iconIndex: Record<string, string> = await iconIndexRes.json()
  const tagMap: Record<string, string[]> = await tagsRes.json()

  const itemMap = new Map<string, Item>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }

  const recipesByOutput = new Map<string, Recipe[]>()
  for (const recipe of recipes) {
    for (const output of recipe.outputs) {
      const existing = recipesByOutput.get(output.item) ?? []
      existing.push(recipe)
      recipesByOutput.set(output.item, existing)
    }
  }

  return { items, itemMap, recipes, recipesByOutput, iconIndex, tagMap }
}
