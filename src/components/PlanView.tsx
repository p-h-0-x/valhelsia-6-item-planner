import { useMemo } from 'react'
import { GraphView } from './GraphView'
import { Sidebar } from './Sidebar'
import { resolveItemDependencies } from '../graph/resolver'
import type { AppData } from '../data/loader'

interface PlanViewProps {
  itemId: string
  data: AppData
  onClose: () => void
  onItemSelect: (itemId: string) => void
}

export function PlanView({ itemId, data, onClose, onItemSelect }: PlanViewProps) {
  const result = useMemo(
    () => resolveItemDependencies(itemId, 1, data.recipesByOutput, data.tagMap),
    [itemId, data.recipesByOutput, data.tagMap]
  )

  const item = data.itemMap.get(itemId)
  const displayName =
    item?.name ?? itemId.split(':')[1]?.replaceAll('_', ' ') ?? itemId

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg"
          >
            &larr;
          </button>
          <h2 className="text-white font-medium capitalize">{displayName}</h2>
          <span className="text-xs text-gray-500">{itemId}</span>
        </div>
        <div className="flex-1">
          <GraphView key={itemId} tree={result.tree} onItemSelect={onItemSelect} />
        </div>
      </div>
      <Sidebar result={result} data={data} />
    </div>
  )
}
