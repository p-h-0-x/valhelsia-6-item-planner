import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ItemIcon } from '../ItemIcon'

interface TagNodeData {
  itemId: string
  quantity: number
  tagId: string
  tagItems: string[]
  isRaw: boolean
  [key: string]: unknown
}

export function TagNode({ data }: NodeProps) {
  const { itemId, quantity, tagId, tagItems } = data as unknown as TagNodeData
  const [expanded, setExpanded] = useState(false)

  const mod = itemId.split(':')[0] ?? 'minecraft'
  const tagLabel = tagId
    .replace('#', '')
    .split(':')[1]
    ?.split('/')
    .pop()
    ?.replaceAll('_', ' ') ?? tagId

  return (
    <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg min-w-[160px] shadow-lg">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 rounded-t-lg"
      >
        <ItemIcon itemId={itemId} mod={mod} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-cyan-300 capitalize truncate">
            Any {tagLabel}
          </div>
          <div className="text-xs text-gray-400">
            x{quantity} &middot; {tagItems.length} options {expanded ? '▲' : '▼'}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 max-h-40 overflow-y-auto">
          {tagItems.map((id) => {
            const itemMod = id.split(':')[0] ?? 'minecraft'
            const itemName = id.split(':')[1]?.replaceAll('_', ' ') ?? id
            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-700"
              >
                <ItemIcon itemId={id} mod={itemMod} size={16} />
                <span className="text-gray-300 capitalize truncate">{itemName}</span>
              </div>
            )
          })}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  )
}
