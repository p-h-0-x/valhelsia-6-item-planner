import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ItemIcon } from '../ItemIcon'

interface RawMaterialData {
  itemId: string
  quantity: number
  [key: string]: unknown
}

export function RawMaterialNode({ data }: NodeProps) {
  const { itemId, quantity } = data as unknown as RawMaterialData
  const mod = itemId.split(':')[0] ?? 'minecraft'
  const name = itemId.split(':')[1]?.replaceAll('_', ' ') ?? itemId

  return (
    <div className="bg-gray-800 border-2 border-green-500 rounded-lg px-3 py-2 min-w-[140px] shadow-lg">
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <div className="flex items-center gap-2">
        <ItemIcon itemId={itemId} mod={mod} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-green-300 capitalize truncate">
            {name}
          </div>
          <div className="text-xs text-gray-400">x{quantity}</div>
        </div>
      </div>
    </div>
  )
}
