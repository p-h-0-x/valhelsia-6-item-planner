import type { ResolutionResult } from '../graph/types'
import type { AppData } from '../data/loader'
import { ItemIcon } from './ItemIcon'

interface SidebarProps {
  result: ResolutionResult
  data: AppData
  onItemSelect?: (itemId: string) => void
}

export function Sidebar({ result, data, onItemSelect }: SidebarProps) {
  const rawMaterials = Array.from(result.rawMaterials.entries())
    .map(([id, qty]) => ({
      id,
      name: data.itemMap.get(id)?.name ?? id.split(':')[1]?.replaceAll('_', ' ') ?? id,
      mod: id.split(':')[0] ?? 'minecraft',
      quantity: qty,
    }))
    .sort((a, b) => b.quantity - a.quantity)

  const machines = Array.from(result.machines).map((id) => ({
    id,
    name: data.itemMap.get(id)?.name ?? id.split(':')[1]?.replaceAll('_', ' ') ?? id,
    mod: id.split(':')[0] ?? 'minecraft',
  }))

  return (
    <div className="w-full md:w-72 bg-gray-900 md:border-l border-gray-700 overflow-y-auto p-4 flex flex-col gap-4">
      <section>
        <h2 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-2">
          Raw Materials ({rawMaterials.length})
        </h2>
        <div className="flex flex-col gap-1">
          {rawMaterials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800"
            >
              <ItemIcon itemId={mat.id} mod={mat.mod} size={20} />
              <span className="text-sm text-gray-300 capitalize flex-1 truncate">
                {mat.name}
              </span>
              <span className="text-sm text-white font-mono">
                x{mat.quantity}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-2">
          Machines ({machines.length})
        </h2>
        <div className="flex flex-col gap-1">
          {machines.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onItemSelect?.(m.id)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 w-full text-left cursor-pointer"
            >
              <ItemIcon itemId={m.id} mod={m.mod} size={20} />
              <span className="text-sm text-gray-300 capitalize truncate">
                {m.name}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
