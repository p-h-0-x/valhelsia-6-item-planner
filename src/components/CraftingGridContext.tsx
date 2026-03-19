import { createContext, useContext } from 'react'

export interface CraftingGridData {
  pattern: (string | null)[][]
  outputItemId: string
  outputCount: number
  isShapeless: boolean
}

interface CraftingGridContextValue {
  openMobileGrid: (data: CraftingGridData) => void
}

const CraftingGridContext = createContext<CraftingGridContextValue | null>(null)

export const CraftingGridProvider = CraftingGridContext.Provider

export function useMobileCraftingGrid() {
  return useContext(CraftingGridContext)
}
