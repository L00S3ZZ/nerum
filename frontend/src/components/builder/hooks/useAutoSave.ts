'use client'

import { useEffect } from 'react'
import type { Edge } from '@xyflow/react'
import { useWorkflow } from './useWorkflow'
import { type FlowNode } from '../catalog'

const KEY = 'nerum_builder_workflow'
const FLAG = 'nerum_workflow_saved'

export interface SavedWorkflow {
  name: string
  nodes: FlowNode[]
  edges: Edge[]
  savedAt: number
}

export function saveWorkflow(): void {
  if (typeof localStorage === 'undefined') return
  const { name, nodes, edges } = useWorkflow.getState()
  const payload: SavedWorkflow = { name, nodes, edges, savedAt: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
    localStorage.setItem(FLAG, '1')
  } catch { /* quota */ }
}

/** True only after the user has saved (manually or via autosave) at least once. */
export function hasSavedWorkflow(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(FLAG) === '1'
}

/** Clear the saved workflow + flag so the next load starts empty. */
export function clearSavedWorkflow(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(FLAG)
  } catch { /* ignore */ }
}

export function loadSavedWorkflow(): SavedWorkflow | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedWorkflow
    if (!Array.isArray(parsed.nodes)) return null
    return parsed
  } catch {
    return null
  }
}

/** Auto-save the current workflow to localStorage every 30s (when non-empty). */
export function useAutoSave(): void {
  useEffect(() => {
    const t = window.setInterval(() => {
      if (useWorkflow.getState().nodes.length > 0) saveWorkflow()
    }, 30000)
    return () => window.clearInterval(t)
  }, [])
}
