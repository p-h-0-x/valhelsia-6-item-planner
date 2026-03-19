import { useState, useRef, useEffect, useCallback } from 'react'
import type { Item } from '../types/item'
import { searchItems } from '../data/search-index'
import { ItemIcon } from './ItemIcon'
import { useIsMobile } from '../hooks/useIsMobile'

interface SearchBarProps {
  items: Item[]
  onSelect: (itemId: string) => void
}

export function SearchBar({ items, onSelect }: SearchBarProps) {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([])
        setOpen(false)
        return
      }
      const found = searchItems(q, items)
      setResults(found)
      setOpen(found.length > 0)
      setActiveIndex(0)
    },
    [items]
  )

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 150)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  function handleSelect(item: Item) {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect(item.id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.children[activeIndex] as HTMLElement
      active?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div className="relative flex-1 md:max-w-xl">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={isMobile ? "Search items..." : "Search items... (e.g. Iron Ingot, Mechanical Press)"}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {results.map((item, i) => (
            <button
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700 ${
                i === activeIndex ? 'bg-gray-700' : ''
              }`}
            >
              <ItemIcon itemId={item.id} mod={item.mod} size={24} />
              <div>
                <div className="text-sm text-white">{item.name}</div>
                <div className="text-xs text-gray-500">{item.id}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
