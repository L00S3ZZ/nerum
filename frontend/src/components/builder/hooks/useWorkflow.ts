'use client'

import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
} from '@xyflow/react'
import {
  type FlowNode,
  type NodeData,
  type NodeKind,
  type RunState,
  createNode,
  edgeStyle,
  KIND_COLOR,
  getUpstreamVariables,
} from '../catalog'

export interface ExecLog {
  id: number
  nodeLabel?: string
  level: 'info' | 'token' | 'success' | 'error'
  text: string
  time: string
}

interface Snapshot { nodes: FlowNode[]; edges: Edge[] }

export interface WorkflowState {
  name: string
  nodes: FlowNode[]
  edges: Edge[]
  selectedId: string | null
  runStatus: 'idle' | 'running' | 'success' | 'error'
  runState: Record<string, RunState>
  runError: Record<string, string>
  logs: ExecLog[]
  past: Snapshot[]
  future: Snapshot[]
  canUndo: boolean

  setName: (n: string) => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (c: Connection) => void
  isValidConnection: (c: Connection | Edge) => boolean
  addNodeAt: (subtype: string, pos: { x: number; y: number }) => void
  updateNodeData: (id: string, patch: Partial<NodeData>) => void
  updateNodeConfig: (id: string, key: string, value: unknown) => void
  setSelected: (id: string | null) => void
  deleteSelected: () => void
  deleteNode: (id: string) => void
  selectAll: () => void
  snapshot: () => void
  undo: () => void
  redo: () => void
  load: (data: { name?: string; nodes: FlowNode[]; edges: Edge[] }) => void
  reset: () => void
  autoLayout: () => void
  variablesFor: (id: string) => string[]

  setRunStatus: (s: WorkflowState['runStatus']) => void
  setNodeRun: (id: string, s: RunState, error?: string) => void
  resetRun: () => void
  pushLog: (l: Omit<ExecLog, 'id' | 'time'>) => void
  clearLogs: () => void
}

let logId = 0
const clock = () => new Date().toLocaleTimeString('en-IN', { hour12: false })
const MAX_HISTORY = 50

export const useWorkflow = create<WorkflowState>((set, get) => ({
  name: 'Untitled workflow',
  nodes: [],
  edges: [],
  selectedId: null,
  runStatus: 'idle',
  runState: {},
  runError: {},
  logs: [],
  past: [],
  future: [],
  canUndo: false,

  setName: (n) => set({ name: n }),

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

  isValidConnection: (c) => {
    const { nodes } = get()
    if (!c.source || !c.target || c.source === c.target) return false
    const target = nodes.find((n) => n.id === c.target)
    const source = nodes.find((n) => n.id === c.source)
    if (!target || !source) return false
    // triggers and notes have no input; notes never produce output
    if (target.data.kind === 'trigger' || target.data.kind === 'note') return false
    if (source.data.kind === 'note') return false
    return true
  },

  onConnect: (c) => {
    if (!get().isValidConnection(c)) return
    get().snapshot()
    const src = get().nodes.find((n) => n.id === c.source)
    const color =
      c.sourceHandle === 'yes' ? '#00E676' : c.sourceHandle === 'no' ? '#FF4D6D' : KIND_COLOR[(src?.data.kind ?? 'action') as NodeKind]
    set({ edges: addEdge({ ...c, animated: true, style: edgeStyle(color) }, get().edges) })
  },

  addNodeAt: (subtype, pos) => {
    get().snapshot()
    const node = createNode(subtype, pos)
    set({ nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }], selectedId: node.id })
  },

  updateNodeData: (id, patch) =>
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) }),

  updateNodeConfig: (id, key, value) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n)),
    }),

  setSelected: (id) => set({ selectedId: id }),

  deleteNode: (id) => {
    get().snapshot()
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    })
  },

  deleteSelected: () => {
    const { nodes, edges } = get()
    const selNodes = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    const hasEdgeSel = edges.some((e) => e.selected)
    if (selNodes.size === 0 && !hasEdgeSel) return
    get().snapshot()
    set({
      nodes: nodes.filter((n) => !selNodes.has(n.id)),
      edges: edges.filter((e) => !e.selected && !selNodes.has(e.source) && !selNodes.has(e.target)),
      selectedId: null,
    })
  },

  selectAll: () =>
    set({ nodes: get().nodes.map((n) => ({ ...n, selected: true })), edges: get().edges.map((e) => ({ ...e, selected: true })) }),

  snapshot: () => {
    const { nodes, edges, past } = get()
    set({ past: [...past.slice(-MAX_HISTORY + 1), { nodes, edges }], future: [], canUndo: true })
  },

  undo: () => {
    const { past, nodes, edges, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    set({ nodes: prev.nodes, edges: prev.edges, past: past.slice(0, -1), future: [{ nodes, edges }, ...future], canUndo: past.length - 1 > 0 })
  },

  redo: () => {
    const { future, nodes, edges, past } = get()
    if (future.length === 0) return
    const nxt = future[0]
    set({ nodes: nxt.nodes, edges: nxt.edges, future: future.slice(1), past: [...past, { nodes, edges }], canUndo: true })
  },

  load: (data) =>
    set({ name: data.name ?? get().name, nodes: data.nodes, edges: data.edges, selectedId: null, past: [], future: [], canUndo: false, runState: {}, runError: {}, runStatus: 'idle' }),

  reset: () => {
    get().snapshot()
    set({ nodes: [], edges: [], selectedId: null, runState: {}, runError: {}, runStatus: 'idle' })
  },

  autoLayout: () => {
    const { nodes, edges } = get()
    if (nodes.length === 0) return
    get().snapshot()
    const incoming = new Map<string, number>()
    nodes.forEach((n) => incoming.set(n.id, 0))
    edges.forEach((e) => incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1))
    const adj = new Map<string, string[]>()
    edges.forEach((e) => adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]))
    // longest-path layering (depth) so children always sit right of parents
    const depth = new Map<string, number>()
    nodes.forEach((n) => depth.set(n.id, 0))
    const order = [...nodes].sort((a, b) => (incoming.get(a.id)! - incoming.get(b.id)!))
    let changed = true
    let guard = 0
    while (changed && guard++ < nodes.length + 2) {
      changed = false
      edges.forEach((e) => {
        const d = (depth.get(e.source) ?? 0) + 1
        if (d > (depth.get(e.target) ?? 0)) {
          depth.set(e.target, d)
          changed = true
        }
      })
    }
    const colCount = new Map<number, number>()
    const laid = order.map((n) => {
      const d = depth.get(n.id) ?? 0
      const row = colCount.get(d) ?? 0
      colCount.set(d, row + 1)
      return { ...n, position: { x: 40 + d * 320, y: 40 + row * 170 } }
    })
    const byId = new Map(laid.map((n) => [n.id, n]))
    set({ nodes: nodes.map((n) => byId.get(n.id) ?? n) })
  },

  variablesFor: (id) => getUpstreamVariables(id, get().nodes, get().edges),

  setRunStatus: (s) => set({ runStatus: s }),
  setNodeRun: (id, s, error) =>
    set({ runState: { ...get().runState, [id]: s }, runError: error ? { ...get().runError, [id]: error } : get().runError }),
  resetRun: () => set({ runState: {}, runError: {}, runStatus: 'idle' }),
  pushLog: (l) => set({ logs: [...get().logs.slice(-200), { ...l, id: ++logId, time: clock() }] }),
  clearLogs: () => set({ logs: [] }),
}))
