// Extract item/block textures from Valhelsia 6 mod JARs.
// Only extracts textures for items that appear in our recipe data.
//
// Usage: npx tsx scripts/extract-icons.ts

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import yauzl from 'yauzl'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MODS_DIR =
  process.argv[2] ||
  'c:/Users/benja/curseforge/minecraft/Instances/Valhelsia 6/mods'
const VANILLA_JAR =
  'c:/Users/benja/curseforge/minecraft/Install/versions/1.20.1/1.20.1.jar'

const DATA_DIR = path.resolve(__dirname, '..', 'public', 'data')
const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons')

interface ItemEntry {
  id: string
  name: string
  mod: string
}

// Build the set of (namespace, itemName) pairs we need icons for
function loadNeededItems(): Map<string, Set<string>> {
  const itemsPath = path.join(DATA_DIR, 'items.json')
  const items: ItemEntry[] = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'))

  // Group by namespace → set of item names
  const needed = new Map<string, Set<string>>()
  for (const item of items) {
    if (item.id.startsWith('#')) continue // skip tags
    const [namespace, itemName] = item.id.split(':')
    if (!namespace || !itemName) continue
    if (!needed.has(namespace)) needed.set(namespace, new Set())
    needed.get(namespace)!.add(itemName)
  }

  return needed
}

// Extract matching textures from a single JAR
function extractTexturesFromJar(
  jarPath: string,
  needed: Map<string, Set<string>>,
  found: Set<string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err)

      let count = 0

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        // Match: assets/<namespace>/textures/item/<name>.png
        //    or: assets/<namespace>/textures/block/<name>.png
        const match = /^assets\/([^/]+)\/textures\/(item|block)\/([^/]+)\.png$/.exec(
          entry.fileName
        )

        if (!match) {
          zipfile.readEntry()
          return
        }

        const namespace = match[1]
        const itemName = match[3]
        const itemId = `${namespace}:${itemName}`

        // Only extract if this item is in our recipe data and not already found
        const nsItems = needed.get(namespace)
        if (!nsItems || !nsItems.has(itemName) || found.has(itemId)) {
          zipfile.readEntry()
          return
        }

        // Skip animated/oversized textures (normal 16x16 PNGs are under 5KB)
        if (entry.uncompressedSize > 5000) {
          zipfile.readEntry()
          return
        }

        zipfile.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) {
            zipfile.readEntry()
            return
          }

          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            const outDir = path.join(ICONS_DIR, namespace)
            fs.mkdirSync(outDir, { recursive: true })
            const outPath = path.join(outDir, `${itemName}.png`)
            fs.writeFileSync(outPath, Buffer.concat(chunks))
            found.add(itemId)
            count++
            zipfile.readEntry()
          })
        })
      })

      zipfile.on('end', () => resolve(count))
      zipfile.on('error', reject)
    })
  })
}

// Second pass: resolve item models to find textures for items still missing icons.
// Reads item model JSONs, follows parent/texture references, and extracts the
// correct texture even when the filename doesn't match the item ID.
function resolveModelsFromJar(
  jarPath: string,
  missingByNs: Map<string, Set<string>>,
  found: Set<string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err)

      // Collect all relevant entries in memory
      const itemModels = new Map<string, Record<string, unknown>>() // "ns:name" → model JSON
      const blockModels = new Map<string, Record<string, unknown>>() // "ns:name" → model JSON
      const textures = new Map<string, { size: number }>() // full path → size

      const pendingReads: Promise<void>[] = []

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        const itemModelMatch = /^assets\/([^/]+)\/models\/item\/([^/]+)\.json$/.exec(entry.fileName)
        // Allow nested block model paths (e.g. models/block/mechanical_press/item.json)
        const blockModelMatch = /^assets\/([^/]+)\/models\/block\/(.+)\.json$/.exec(entry.fileName)
        // Allow any texture path (item/, block/, pnc_model/, etc.)
        const textureMatch = /^assets\/([^/]+)\/textures\/.+\.png$/.exec(entry.fileName)

        if (itemModelMatch) {
          const ns = itemModelMatch[1]
          const name = itemModelMatch[2]
          if (missingByNs.has(ns) && missingByNs.get(ns)!.has(name)) {
            const p = new Promise<void>((res) => {
              zipfile.openReadStream(entry, (err2, stream) => {
                if (err2 || !stream) { res(); return }
                const chunks: Buffer[] = []
                stream.on('data', (chunk: Buffer) => chunks.push(chunk))
                stream.on('end', () => {
                  try {
                    const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                    itemModels.set(`${ns}:${name}`, data)
                  } catch { /* skip */ }
                  res()
                })
              })
            })
            pendingReads.push(p)
          }
        } else if (blockModelMatch) {
          const ns = blockModelMatch[1]
          const modelPath = blockModelMatch[2] // e.g. "shaft" or "mechanical_press/item"
          const p = new Promise<void>((res) => {
            zipfile.openReadStream(entry, (err2, stream) => {
              if (err2 || !stream) { res(); return }
              const chunks: Buffer[] = []
              stream.on('data', (chunk: Buffer) => chunks.push(chunk))
              stream.on('end', () => {
                try {
                  const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                  blockModels.set(`${ns}:${modelPath}`, data)
                } catch { /* skip */ }
                res()
              })
            })
          })
          pendingReads.push(p)
        } else if (textureMatch) {
          textures.set(entry.fileName, { size: entry.uncompressedSize })
        }

        zipfile.readEntry()
      })

      zipfile.on('end', async () => {
        await Promise.all(pendingReads)

        // Helper: resolve a texture reference like "create:block/bars/andesite_bars" to a full path
        function resolveTexRef(ref: string, defaultNs: string): string | null {
          const [texNs, texPath] = ref.includes(':') ? ref.split(':') : [defaultNs, ref]
          // Try the path directly under textures/ (handles item/, block/, pnc_model/, etc.)
          const directPath = `assets/${texNs}/textures/${texPath}.png`
          if (textures.has(directPath)) return directPath
          // Try adding item/ or block/ prefix if the path doesn't already have a subdirectory
          if (!texPath.includes('/')) {
            for (const prefix of ['item', 'block']) {
              const fullPath = `assets/${texNs}/textures/${prefix}/${texPath}.png`
              if (textures.has(fullPath)) return fullPath
            }
          }
          return null
        }

        // Helper: pick the best texture reference from a textures object
        function pickTexRef(texObj: Record<string, string>): string | null {
          // Priority order for texture keys
          const priorityKeys = ['layer0', 'texture', 'all', 'front', 'side', 'top', 'particle']
          for (const key of priorityKeys) {
            if (texObj[key] && !texObj[key].startsWith('#')) return texObj[key]
          }
          // Fall back to first non-particle, non-# value
          for (const val of Object.values(texObj)) {
            if (val && !val.startsWith('#')) return val
          }
          return null
        }

        // Resolve texture paths for missing items
        const textureMap = new Map<string, string[]>() // texturePath → [itemIds]

        for (const [itemKey, model] of itemModels) {
          const [ns] = itemKey.split(':')
          if (found.has(itemKey)) continue

          let texturePath: string | null = null

          // 1. Check item model's own textures (any key, not just layer0)
          const texObj = model.textures as Record<string, string> | undefined
          if (texObj) {
            const ref = pickTexRef(texObj)
            if (ref) texturePath = resolveTexRef(ref, ns)
          }

          // 2. If no texture found, follow parent model chain
          if (!texturePath && typeof model.parent === 'string') {
            const parent = model.parent as string
            const parentRef = parent.includes(':') ? parent : `${ns}:${parent}`
            const [pNs, pPath] = parentRef.split(':')

            // Resolve block model key — parent could be "create:block/shaft" or "create:block/mechanical_press/item"
            let blockModelKey: string | null = null
            if (pPath.startsWith('block/')) {
              blockModelKey = `${pNs}:${pPath.slice('block/'.length)}`
            } else if (pPath.startsWith('item/')) {
              // Parent is another item model — skip (we only loaded item models for missing items)
              blockModelKey = null
            } else {
              blockModelKey = `${pNs}:${pPath}`
            }

            if (blockModelKey) {
              const blockModel = blockModels.get(blockModelKey)
              if (blockModel) {
                // Merge item model textures with block model textures (item overrides)
                const blockTex = blockModel.textures as Record<string, string> | undefined
                if (blockTex) {
                  // If the item model has textures that provide values for the block model's variables, use those
                  const mergedTex = { ...blockTex, ...(texObj ?? {}) }
                  const ref = pickTexRef(mergedTex)
                  if (ref) texturePath = resolveTexRef(ref, pNs)
                }

                // If block model also has a parent, try one more level
                if (!texturePath && typeof blockModel.parent === 'string') {
                  const bp = blockModel.parent as string
                  const bpRef = bp.includes(':') ? bp : `${pNs}:${bp}`
                  const [bpNs, bpPath] = bpRef.split(':')
                  const bpKey = bpPath.startsWith('block/') ? `${bpNs}:${bpPath.slice('block/'.length)}` : `${bpNs}:${bpPath}`
                  const grandparent = blockModels.get(bpKey)
                  if (grandparent?.textures) {
                    const gpTex = grandparent.textures as Record<string, string>
                    const merged = { ...gpTex, ...(blockTex ?? {}), ...(texObj ?? {}) }
                    const ref = pickTexRef(merged)
                    if (ref) texturePath = resolveTexRef(ref, bpNs)
                  }
                }
              }
            }
          }

          if (texturePath) {
            if (!textureMap.has(texturePath)) textureMap.set(texturePath, [])
            textureMap.get(texturePath)!.push(itemKey)
          }
        }

        if (textureMap.size === 0) {
          resolve(0)
          return
        }

        // Now extract the resolved textures — need to re-open the JAR
        let count = 0
        yauzl.open(jarPath, { lazyEntries: true }, (err2, zf2) => {
          if (err2 || !zf2) { resolve(0); return }

          zf2.readEntry()
          zf2.on('entry', (entry) => {
            const targets = textureMap.get(entry.fileName)
            if (!targets) { zf2.readEntry(); return }

            zf2.openReadStream(entry, (err3, stream) => {
              if (err3 || !stream) { zf2.readEntry(); return }
              const chunks: Buffer[] = []
              stream.on('data', (chunk: Buffer) => chunks.push(chunk))
              stream.on('end', () => {
                const buf = Buffer.concat(chunks)
                for (const itemKey of targets) {
                  if (found.has(itemKey)) continue
                  const [ns, name] = itemKey.split(':')
                  const outDir = path.join(ICONS_DIR, ns)
                  fs.mkdirSync(outDir, { recursive: true })
                  fs.writeFileSync(path.join(outDir, `${name}.png`), buf)
                  found.add(itemKey)
                  count++
                }
                zf2.readEntry()
              })
            })
          })

          zf2.on('end', () => resolve(count))
          zf2.on('error', () => resolve(count))
        })
      })

      zipfile.on('error', reject)
    })
  })
}

async function main() {
  console.log('Loading item list from recipe data...')
  const needed = loadNeededItems()

  let totalNeeded = 0
  for (const items of needed.values()) totalNeeded += items.size
  console.log(`Need icons for ${totalNeeded} items across ${needed.size} namespaces`)

  // Clean icons dir
  if (fs.existsSync(ICONS_DIR)) {
    fs.rmSync(ICONS_DIR, { recursive: true })
  }
  fs.mkdirSync(ICONS_DIR, { recursive: true })

  // Collect all JARs
  const allJarPaths: string[] = []
  if (fs.existsSync(VANILLA_JAR)) {
    allJarPaths.push(VANILLA_JAR)
  }
  const modJars = fs.readdirSync(MODS_DIR).filter((f) => f.endsWith('.jar'))
  for (const jar of modJars) {
    allJarPaths.push(path.join(MODS_DIR, jar))
  }

  console.log(`Scanning ${allJarPaths.length} JARs for textures...`)

  const found = new Set<string>()
  let totalExtracted = 0

  // First pass: extract item/ textures (preferred) — direct name match
  for (const jarPath of allJarPaths) {
    try {
      const count = await extractTexturesFromJar(jarPath, needed, found)
      totalExtracted += count
    } catch {
      // skip unreadable JARs
    }
  }

  console.log(`\nFirst pass: ${totalExtracted} icons extracted (direct name match)`)

  // Second pass: resolve item models for still-missing items
  const missingByNs = new Map<string, Set<string>>()
  for (const [ns, items] of needed) {
    for (const item of items) {
      if (!found.has(`${ns}:${item}`)) {
        if (!missingByNs.has(ns)) missingByNs.set(ns, new Set())
        missingByNs.get(ns)!.add(item)
      }
    }
  }

  let modelResolved = 0
  if (missingByNs.size > 0) {
    console.log(`\nSecond pass: resolving item models for missing icons...`)
    for (const jarPath of allJarPaths) {
      try {
        const count = await resolveModelsFromJar(jarPath, missingByNs, found)
        modelResolved += count
      } catch {
        // skip
      }
    }
    console.log(`Second pass: ${modelResolved} additional icons resolved via models`)
  }

  totalExtracted += modelResolved
  console.log(`\nTotal: ${totalExtracted} icon textures`)
  console.log(`Coverage: ${found.size} / ${totalNeeded} items (${((found.size / totalNeeded) * 100).toFixed(1)}%)`)

  // Report missing by namespace
  const missing: string[] = []
  for (const [ns, items] of needed) {
    for (const item of items) {
      if (!found.has(`${ns}:${item}`)) {
        missing.push(`${ns}:${item}`)
      }
    }
  }

  if (missing.length > 0) {
    console.log(`\nMissing icons (${missing.length}):`)
    // Group by namespace for readability
    const byNs = new Map<string, string[]>()
    for (const id of missing) {
      const ns = id.split(':')[0]
      if (!byNs.has(ns)) byNs.set(ns, [])
      byNs.get(ns)!.push(id)
    }
    for (const [ns, items] of Array.from(byNs).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
      console.log(`  ${ns}: ${items.length} missing (${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''})`)
    }
  }

  // Write an index mapping itemId -> relative icon path (for items that have icons)
  const iconIndex: Record<string, string> = {}
  for (const id of found) {
    const [ns, name] = id.split(':')
    iconIndex[id] = `icons/${ns}/${name}.png`
  }
  fs.writeFileSync(
    path.join(DATA_DIR, 'icon-index.json'),
    JSON.stringify(iconIndex)
  )
  console.log(`\nWrote icon index (${Object.keys(iconIndex).length} entries)`)

  console.log('Done!')
}

main().catch(console.error)
