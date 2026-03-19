import type { Recipe } from '../types/recipe'

export interface DependencyNode {
  itemId: string
  quantity: number
  recipe: Recipe | null
  machine: string | null
  children: DependencyNode[]
  depth: number
  /** If this node was resolved from a tag, the original tag ID */
  tagId?: string
  /** All valid items for this tag */
  tagItems?: string[]
}

export interface ResolutionResult {
  tree: DependencyNode
  rawMaterials: Map<string, number>
  machines: Set<string>
}
