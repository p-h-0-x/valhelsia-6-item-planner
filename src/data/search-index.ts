import Fuse from 'fuse.js'
import type { Item } from '../types/item'

let fuseInstance: Fuse<Item> | null = null

export function buildSearchIndex(items: Item[]): Fuse<Item> {
  fuseInstance = new Fuse(items, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'id', weight: 1 },
      { name: 'mod', weight: 0.5 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
  return fuseInstance
}

export function searchItems(query: string, items: Item[], limit = 50): Item[] {
  if (!query || query.length < 2) return []

  if (!fuseInstance) {
    fuseInstance = buildSearchIndex(items)
  }

  return fuseInstance.search(query, { limit }).map((r) => r.item)
}
