import { ItemIcon } from './ItemIcon'

interface CraftingGridProps {
  pattern: (string | null)[][]
  outputItemId: string
  outputCount: number
  isShapeless?: boolean
}

export function CraftingGrid({ pattern, outputItemId, outputCount, isShapeless }: CraftingGridProps) {
  const outputMod = outputItemId.split(':')[0] ?? 'minecraft'

  // Normalize pattern to 3x3 for display
  const rows = 3
  const cols = 3
  const grid: (string | null)[][] = []
  for (let r = 0; r < rows; r++) {
    const row: (string | null)[] = []
    for (let c = 0; c < cols; c++) {
      row.push(pattern[r]?.[c] ?? null)
    }
    grid.push(row)
  }

  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="grid grid-cols-3 gap-0.5">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className="w-9 h-9 bg-gray-700 border border-gray-600 flex items-center justify-center"
                title={cell ?? undefined}
              >
                {cell && (
                  <ItemIcon
                    itemId={cell}
                    mod={cell.split(':')[0] ?? 'minecraft'}
                    size={28}
                  />
                )}
              </div>
            ))
          )}
        </div>
        {isShapeless && (
          <div className="text-xs text-gray-500 text-center mt-1">shapeless</div>
        )}
      </div>

      <div className="text-gray-400 text-lg select-none">&rarr;</div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 bg-gray-700 border-2 border-yellow-600 flex items-center justify-center">
          <ItemIcon itemId={outputItemId} mod={outputMod} size={32} />
        </div>
        {outputCount > 1 && (
          <div className="text-xs text-yellow-400">x{outputCount}</div>
        )}
      </div>
    </div>
  )
}
