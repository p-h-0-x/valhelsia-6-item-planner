import { useMemo, useState } from 'react'
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

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const item = data.itemMap.get(itemId)
  const displayName =
    item?.name ?? itemId.split(':')[1]?.replaceAll('_', ' ') ?? itemId

  return (
    <div className="relative flex flex-col md:flex-row h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-gray-800 border-b border-gray-700">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg"
          >
            &larr;
          </button>
          <h2 className="text-white font-medium capitalize truncate flex-1">{displayName}</h2>
          <span className="text-xs text-gray-500 hidden sm:inline">{itemId}</span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-sm px-3 py-1 bg-gray-700 text-green-400 rounded-lg border border-gray-600 whitespace-nowrap"
          >
            Materials {sidebarOpen ? '\u25BC' : '\u25B2'}
          </button>
        </div>
        <div className="flex-1">
          <GraphView key={itemId} tree={result.tree} onItemSelect={onItemSelect} />
        </div>
      </div>

      <div className="hidden md:block">
        <Sidebar result={result} data={data} />
      </div>

      {sidebarOpen && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 max-h-[60vh] bg-gray-900 border-t border-gray-700 overflow-y-auto z-40 rounded-t-xl shadow-2xl animate-slideUp">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-bold text-green-400 uppercase tracking-wide">
              Materials
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white text-lg px-2"
            >
              &times;
            </button>
          </div>
          <Sidebar result={result} data={data} />
        </div>
      )}
    </div>
  )
}
