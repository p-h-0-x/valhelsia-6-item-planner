import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ItemIcon } from '../ItemIcon'

interface CraftedItemData {
  itemId: string
  quantity: number
  machine: string | null
  isRaw: boolean
  recipeName?: string
  [key: string]: unknown
}

export function CraftedItemNode({ data }: NodeProps) {
  const { itemId, quantity, machine, recipeName } = data as unknown as CraftedItemData
  const mod = itemId.split(':')[0] ?? 'minecraft'
  const name = itemId.split(':')[1]?.replaceAll('_', ' ') ?? itemId

  return (
    <div className="bg-gray-800 border-2 border-purple-500 rounded-lg px-3 py-2 min-w-[160px] shadow-lg cursor-pointer hover:bg-gray-700 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="flex items-center gap-2">
        <ItemIcon itemId={itemId} mod={mod} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white capitalize truncate">
            {name}
          </div>
          <div className="text-xs text-gray-400">x{quantity}</div>
        </div>
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
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  )
}
