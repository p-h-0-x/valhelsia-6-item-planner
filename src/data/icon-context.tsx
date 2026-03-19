import { createContext, useContext } from 'react'

const IconIndexContext = createContext<Record<string, string>>({})

export const IconIndexProvider = IconIndexContext.Provider

export function useIconPath(itemId: string): string | undefined {
  const index = useContext(IconIndexContext)
  return index[itemId]
}
