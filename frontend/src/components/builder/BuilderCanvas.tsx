'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useReactFlow,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { LayoutGrid, Maximize, MousePointerClick } from 'lucide-react'
import { useWorkflow } from './hooks/useWorkflow'
import TriggerNode from './nodes/TriggerNode'
import ActionNode from './nodes/ActionNode'
import AiNode from './nodes/AiNode'
import ConditionNode from './nodes/ConditionNode'
import LogicNode from './nodes/LogicNode'
import NoteNode from './nodes/NoteNode'

const nodeTypes = { trigger: TriggerNode, action: ActionNode, ai: AiNode, condition: ConditionNode, logic: LogicNode, note: NoteNode }

const connectionLineStyle = { stroke: '#7B2FFF', strokeWidth: 2, strokeDasharray: '6 4' }

export default function BuilderCanvas() {
  const nodes = useWorkflow((s) => s.nodes)
  const edges = useWorkflow((s) => s.edges)
  const onNodesChange = useWorkflow((s) => s.onNodesChange)
  const onEdgesChange = useWorkflow((s) => s.onEdgesChange)
  const onConnect = useWorkflow((s) => s.onConnect)
  const isValidConnection = useWorkflow((s) => s.isValidConnection)
  const addNodeAt = useWorkflow((s) => s.addNodeAt)
  const setSelected = useWorkflow((s) => s.setSelected)
  const snapshot = useWorkflow((s) => s.snapshot)
  const autoLayout = useWorkflow((s) => s.autoLayout)
  const empty = nodes.length === 0

  const { screenToFlowPosition, fitView } = useReactFlow()

  // On mount, if a saved workflow was restored, frame it nicely.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (useWorkflow.getState().nodes.length > 0) {
      window.setTimeout(() => fitView({ padding: 0.3, maxZoom: 1, duration: 300 }), 120)
    }
  }, [fitView])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const subtype = e.dataTransfer.getData('application/nerum-builder')
      if (!subtype) return
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNodeAt(subtype, pos)
      // pan/zoom so the new node and all existing nodes are visible
      window.setTimeout(() => fitView({ padding: 0.3, maxZoom: 1, duration: 400 }), 80)
    },
    [screenToFlowPosition, addNodeAt, fitView]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelected(node.id), [setSelected])

  return (
    <div style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative', minWidth: 0 }} onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onNodeDragStart={() => snapshot()}
        onPaneClick={() => setSelected(null)}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={{ animated: true }}
        deleteKeyCode={null}
        selectionOnDrag
        panOnDrag={[1, 2]}
        panActivationKeyCode="Space"
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
        defaultViewport={{ x: 50, y: 50, zoom: 0.85 }}
        minZoom={0.3}
        maxZoom={2}
        style={{ background: '#07080F' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#1a1c2b" />
        <Controls style={{ background: 'rgba(13,14,26,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }} showInteractive={false} />
        <Panel position="top-right">
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => autoLayout()} title="Auto-layout" style={panelBtn}><LayoutGrid size={15} /> Tidy</button>
            <button onClick={() => fitView({ duration: 400, padding: 0.2 })} title="Fit view" style={panelBtn}><Maximize size={15} /></button>
          </div>
        </Panel>
      </ReactFlow>

      {empty && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: '#6B7090' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600, color: '#9AA0B8' }}>
              <MousePointerClick size={20} />
              <span className="plasma-gradient-text">Drag a node to start building your agent</span>
              <motion.span animate={{ x: [0, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: 22, color: '#FF6B00' }}>→</motion.span>
            </div>
            <p className="font-mono" style={{ fontSize: 12, marginTop: 12 }}>or load a template from the top bar</p>
          </div>
        </div>
      )}
    </div>
  )
}

const panelBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 9,
  background: 'rgba(13,14,26,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#cdd0dd', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
}
