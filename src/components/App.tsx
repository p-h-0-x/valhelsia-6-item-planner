import { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { PlanView } from './PlanView'
import { loadData, type AppData } from '../data/loader'
import { IconIndexProvider } from '../data/icon-context'

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  useEffect(() => {
    loadData().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-400">Loading item data...</div>
      </div>
    )
  }

  return (
    <IconIndexProvider value={data.iconIndex}>
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-700">
          <h1 className="text-lg font-bold text-purple-400 whitespace-nowrap">
            Valhelsia 6 Planner
          </h1>
          <SearchBar
            items={data.items}
            onSelect={(itemId) => setSelectedItem(itemId)}
          />
        </header>
        <main className="flex-1 overflow-hidden">
          {selectedItem ? (
            <PlanView
              itemId={selectedItem}
              data={data}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Search for an item to start planning
            </div>
          )}
        </main>
      </div>
    </IconIndexProvider>
  )
}
