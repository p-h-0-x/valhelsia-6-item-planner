export interface RecipeIngredient {
  item: string
  count: number
  alternatives?: string[]
}

export interface RecipeResult {
  item: string
  count: number
}

export interface Recipe {
  id: string
  type: string
  machine: string
  inputs: RecipeIngredient[]
  outputs: RecipeResult[]
  pattern?: (string | null)[][]
}

export const RECIPE_TYPE_TO_MACHINE: Record<string, string> = {
  'minecraft:crafting_shaped': 'minecraft:crafting_table',
  'minecraft:crafting_shapeless': 'minecraft:crafting_table',
  'minecraft:smelting': 'minecraft:furnace',
  'minecraft:blasting': 'minecraft:blast_furnace',
  'minecraft:smoking': 'minecraft:smoker',
  'minecraft:stonecutting': 'minecraft:stonecutter',
  'minecraft:smithing_transform': 'minecraft:smithing_table',
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
}
