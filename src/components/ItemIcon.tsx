import { useState } from 'react'
import { useIconPath } from '../data/icon-context'

const MOD_COLORS: Record<string, string> = {
  minecraft: '#5a8f3c',
  create: '#d4a017',
  mekanism: '#3dc2c7',
  botania: '#7b68ee',
  ars_nouveau: '#8b5cf6',
  pneumaticcraft: '#f59e0b',
  farmersdelight: '#92400e',
}

interface ItemIconProps {
  itemId: string
  mod: string
  size?: number
}

export function ItemIcon({ itemId, mod, size = 32 }: ItemIconProps) {
  const [imgError, setImgError] = useState(false)
  const iconPath = useIconPath(itemId)
  const base = import.meta.env.BASE_URL

  if (iconPath && !imgError) {
    return (
      <img
        src={`${base}${iconPath}`}
        alt={itemId}
        title={itemId}
        width={size}
        height={size}
        className="shrink-0"
        style={{ imageRendering: 'pixelated' }}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    )
  }

  const color = MOD_COLORS[mod] ?? '#6b7280'
  const label = itemId.split(':')[1]?.substring(0, 2).toUpperCase() ?? '??'

  return (
    <div
      className="flex items-center justify-center rounded font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
        imageRendering: 'pixelated',
      }}
      title={itemId}
    >
      {label}
    </div>
  )
}
