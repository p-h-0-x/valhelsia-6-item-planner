import { useCallback, useEffect, useMemo } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CraftedItemNode } from './nodes/CraftedItemNode'
import { RawMaterialNode } from './nodes/RawMaterialNode'
import { TagNode } from './nodes/TagNode'
import { treeToFlow } from '../graph/layout'
import type { DependencyNode } from '../graph/types'

const nodeTypes: NodeTypes = {
  craftedItem: CraftedItemNode,
  rawMaterial: RawMaterialNode,
  tagItem: TagNode,
}

interface GraphViewProps {
  tree: DependencyNode
  onItemSelect?: (itemId: string) => void
}

function GraphViewInner({ tree, onItemSelect }: GraphViewProps) {
  const isMobile = useIsMobile()
  const flowData = useMemo(() => treeToFlow(tree), [tree])
  const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges)
  const { fitView } = useReactFlow()

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const itemId = node.data.itemId as string | undefined
      if (itemId && onItemSelect) {
        onItemSelect(itemId)
      }
    },
    [onItemSelect]
  )

  useEffect(() => {
    setNodes(flowData.nodes)
    setEdges(flowData.edges)
    setTimeout(() => fitView(), 50)
  }, [flowData, setNodes, setEdges, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ animated: true }}
    >
      <Controls className="!bg-gray-800 !border-gray-600 !shadow-lg [&>button]:!bg-gray-700 [&>button]:!border-gray-600 [&>button]:!text-white [&>button:hover]:!bg-gray-600 [&>button]:!w-10 [&>button]:!h-10 md:[&>button]:!w-8 md:[&>button]:!h-8" />
      {!isMobile && (
        <MiniMap
          className="!bg-gray-800 !border-gray-600"
          nodeColor={(n) =>
            n.type === 'rawMaterial' ? '#22c55e' : n.type === 'tagItem' ? '#06b6d4' : '#8b5cf6'
          }
        />
      )}
      <Background variant={BackgroundVariant.Dots} color="#374151" gap={20} />
    </ReactFlow>
  )
}

export function GraphView({ tree, onItemSelect }: GraphViewProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <GraphViewInner tree={tree} onItemSelect={onItemSelect} />
      </ReactFlowProvider>
    </div>
  )
}
