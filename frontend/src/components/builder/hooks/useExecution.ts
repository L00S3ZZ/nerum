'use client'

import { useCallback } from 'react'
import { useWorkflow } from './useWorkflow'
import { useToast } from '@/components/dashboard/Toast'
import { api } from '@/lib/api'

interface RunResult {
  run_id?: number
  status: 'success' | 'failed'
  results?: Record<string, unknown>
  error?: string
}

export function useExecution() {
  const { toast } = useToast()
  const running = useWorkflow((s) => s.runStatus === 'running')

  const run = useCallback(
    async (input = '') => {
      const s = useWorkflow.getState()
      const { nodes, edges, name } = s

      const hasTrigger = nodes.some((n) => n.data.kind === 'trigger')
      const hasOther = nodes.some((n) => n.data.kind !== 'trigger' && n.data.kind !== 'note')
      if (!hasTrigger || !hasOther || edges.length === 0) {
        toast('Add a Trigger and connect it to at least one other node', 'error')
        return
      }

      s.resetRun()
      s.setRunStatus('running')
      s.clearLogs()
      s.pushLog({ level: 'info', text: '▶ Running on the server…' })

      const executable = nodes.filter((n) => n.data.kind !== 'note')
      executable.forEach((n) => s.setNodeRun(n.id, 'running'))

      const payload = {
        name,
        config: {
          nodes: executable.map((n) => ({ id: n.id, type: n.data.kind, subtype: n.data.subtype, config: n.data.config })),
          edges: edges.map((e) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
        },
        input: input ? { message: input } : {},
      }

      try {
        const res = await api.post<RunResult>('/workflows/run', payload)
        const results = res.results ?? {}
        const labelOf = (id: string) => nodes.find((n) => n.id === id)?.data.label

        for (const n of executable) {
          const out = results[n.id]
          if (out !== undefined) {
            useWorkflow.getState().setNodeRun(n.id, 'done')
            useWorkflow.getState().pushLog({ level: 'success', nodeLabel: labelOf(n.id), text: typeof out === 'string' ? out : JSON.stringify(out) })
          } else if (res.status === 'failed') {
            useWorkflow.getState().setNodeRun(n.id, 'error', res.error)
          } else {
            useWorkflow.getState().setNodeRun(n.id, 'done')
          }
        }

        if (res.status === 'success') {
          useWorkflow.getState().setRunStatus('success')
          useWorkflow.getState().pushLog({ level: 'success', text: '✓ Run complete' })
          toast('Run complete', 'success')
        } else {
          useWorkflow.getState().setRunStatus('error')
          useWorkflow.getState().pushLog({ level: 'error', text: res.error ?? 'Run failed' })
          toast(res.error ?? 'Run failed', 'error')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        executable.forEach((n) => useWorkflow.getState().setNodeRun(n.id, 'error', msg))
        useWorkflow.getState().setRunStatus('error')
        useWorkflow.getState().pushLog({ level: 'error', text: `✗ ${msg}` })
        toast(msg, 'error')
      }
    },
    [toast]
  )

  return { run, running }
}
