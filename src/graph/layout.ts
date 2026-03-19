import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { DependencyNode } from './types'

export interface FlowData {
  nodes: Node[]
  edges: Edge[]
}

export function treeToFlow(root: DependencyNode): FlowData {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let counter = 0

  function traverse(node: DependencyNode, parentId?: string) {
    const nodeId = `n-${counter++}`
    const isRaw = !node.recipe
    const isTag = !!node.tagId && !!node.tagItems && node.tagItems.length > 1

    let nodeType: string
    if (isTag) {
      nodeType = 'tagItem'
    } else if (isRaw) {
      nodeType = 'rawMaterial'
    } else {
      nodeType = 'craftedItem'
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      data: {
        itemId: node.itemId,
        quantity: node.quantity,
        machine: node.machine,
        isRaw,
        recipeName: node.recipe?.type,
        pattern: node.recipe?.pattern,
        outputCount: node.recipe?.outputs.find((o) => o.item === node.itemId)?.count ?? 1,
        tagId: node.tagId,
        tagItems: node.tagItems,
      },
      position: { x: 0, y: 0 },
    })

    if (parentId) {
      edges.push({
        id: `e-${nodeId}-${parentId}`,
        source: nodeId,
        target: parentId,
        animated: true,
        style: { stroke: '#6366f1' },
      })
    }

    for (const child of node.children) {
      traverse(child, nodeId)
    }
  }

  traverse(root)
  return applyLayout(nodes, edges)
}

function applyLayout(nodes: Node[], edges: Edge[]): FlowData {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  for (const node of nodes) {
    g.setNode(node.id, { width: 180, height: 60 })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const laidOut = nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: { x: pos.x - 90, y: pos.y - 30 },
    }
  })

  return { nodes: laidOut, edges }
}
