import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ItemIcon } from '../ItemIcon'
import { CraftingGrid } from '../CraftingGrid'
import { useMobileCraftingGrid } from '../CraftingGridContext'
import { useIsMobile } from '../../hooks/useIsMobile'

interface CraftedItemData {
  itemId: string
  quantity: number
  machine: string | null
  isRaw: boolean
  recipeName?: string
  pattern?: (string | null)[][]
  outputCount?: number
  [key: string]: unknown
}

export function CraftedItemNode({ data }: NodeProps) {
  const { itemId, quantity, machine, recipeName, pattern, outputCount } = data as unknown as CraftedItemData
  const [showGrid, setShowGrid] = useState(false)
  const isMobile = useIsMobile()
  const mobileGrid = useMobileCraftingGrid()
  const mod = itemId.split(':')[0] ?? 'minecraft'
  const name = itemId.split(':')[1]?.replaceAll('_', ' ') ?? itemId
  const isShapeless = recipeName === 'minecraft:crafting_shapeless'
  const hasCraftingPattern = !!pattern && (recipeName === 'minecraft:crafting_shaped' || isShapeless)

  return (
    <div className="relative bg-gray-800 border-2 border-purple-500 rounded-lg px-3 py-2 min-w-[160px] shadow-lg cursor-pointer hover:bg-gray-700 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="flex items-center gap-2">
        <ItemIcon itemId={itemId} mod={mod} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white capitalize truncate">
            {name}
          </div>
          <div className="text-xs text-gray-400">x{quantity}</div>
        </div>
        {hasCraftingPattern && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isMobile && mobileGrid && pattern) {
                mobileGrid.openMobileGrid({ pattern, outputItemId: itemId, outputCount: outputCount ?? 1, isShapeless })
              } else {
                setShowGrid(!showGrid)
              }
            }}
            className="shrink-0 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded bg-purple-500/20 md:bg-transparent hover:bg-gray-600 transition-colors"
            title="View crafting pattern"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-purple-400">
              <rect x="0.5" y="0.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="5.5" y="0.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="10.5" y="0.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="0.5" y="5.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="5.5" y="5.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="10.5" y="5.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="0.5" y="10.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="5.5" y="10.5" width="3" height="3" rx="0.5" stroke="currentColor" />
              <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" stroke="currentColor" />
            </svg>
          </button>
        )}
      </div>
      {machine && (
        <div className="mt-1 text-xs text-yellow-400 truncate">
          {machine.split(':')[1]?.replaceAll('_', ' ')}
        </div>
      )}
      {recipeName && (
        <div className="text-xs text-gray-500 truncate">
          {recipeName.split(':')[1]?.replaceAll('_', ' ')}
        </div>
      )}
      {showGrid && pattern && (
        <div
          className="absolute left-0 top-full mt-2 z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-2 h-2 bg-gray-800 border-l border-t border-gray-600 rotate-45 absolute -top-[5px] left-4" />
          <CraftingGrid
            pattern={pattern}
            outputItemId={itemId}
            outputCount={outputCount ?? 1}
            isShapeless={isShapeless}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  )
}
