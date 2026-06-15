/* ============================================================================
 * NERUM — AI Agent Workflow Builder
 * ----------------------------------------------------------------------------
 * ARCHITECTURE DECISIONS (grounded in research)
 *
 * Studied n8n, LangFlow, Flowise, Dify, Make, Activepieces and the agent
 * literature (ReAct, Toolformer, AutoGPT, LangGraph, CoT, HuggingGPT, Generative
 * Agents). Key takeaway: LangFlow/Flowise model "every node is an LLM/chain" —
 * great for RAG demos, wrong for a Chennai shopkeeper. n8n's strength is
 * orchestrating *real-world actions* (messages, payments, sheets) with branching
 * and error handling. Nerum's users want the latter, so:
 *
 * 1. EXECUTION MODEL — a directed acyclic graph executed in TOPOLOGICAL order
 *    (n8n/LangGraph-style), NOT a single ReAct while-loop. Triggers are sources;
 *    each downstream node runs once its inputs are ready. Individual AI nodes may
 *    reason internally (ReAct/CoT) but the graph itself is the control flow —
 *    deterministic, debuggable, and easy for a non-coder to read top-to-bottom.
 *
 * 2. AGENT MEMORY — a shared variable context threaded node→node. Every node can
 *    publish an output variable; downstream nodes reference it with {{var}}
 *    (HuggingGPT-style task hand-off). Built-ins: {{trigger.message}},
 *    {{trigger.phone}}, {{ai.output}}, {{current.date}}… Upstream variables are
 *    computed by walking the graph backwards (see getUpstreamVariables).
 *
 * 3. TOOL CALLING — each Action node IS a tool (Toolformer framing). The engine
 *    maps a node's {subtype, config} to a backend tool endpoint
 *    (/integrations/whatsapp/send, …). AI nodes request tools; the graph wires
 *    them. The frontend serializes {workflow, connections, input, user_key} and
 *    streams execution over SSE.
 *
 * 4. WHAT MAKES NERUM DIFFERENT (vs n8n / LangFlow for Indian SMBs) — built for
 *    India's real stack (WhatsApp, Razorpay, Tally, Sheets), bilingual
 *    Tamil/English action nodes, business-shaped templates (sweet-shop order,
 *    clinic reminder, invoice-via-WhatsApp), BYOK so owners pay providers
 *    directly, and an approachable card UI — not a developer IDE.
 *
 * 5. MAX AGENT LOOP DEPTH — 25 (AutoGPT's lesson: cap autonomy or it burns money
 *    in a runaway loop). Loop nodes and any cyclic path are bounded at 25
 *    iterations server-side before a hard stop.
 *
 * Stack: React Flow v12 (canvas) + zustand (workflow store, undo/redo) + Framer
 * Motion. Brand: #07080F / #FF6B00 / #7B2FFF / #00D4FF / #FFD60A. No new deps.
 * ========================================================================== */
'use client'

import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useWorkflow } from '@/components/builder/hooks/useWorkflow'
import { useAutoSave, loadSavedWorkflow, saveWorkflow, hasSavedWorkflow } from '@/components/builder/hooks/useAutoSave'
import { useKeyboard } from '@/components/builder/hooks/useKeyboard'
import { useToast } from '@/components/dashboard/Toast'
import TopBar from '@/components/builder/TopBar'
import NodeSidebar from '@/components/builder/NodeSidebar'
import BuilderCanvas from '@/components/builder/BuilderCanvas'
import ConfigPanel from '@/components/builder/ConfigPanel'
import ExecutionPanel from '@/components/builder/ExecutionPanel'
import ShortcutsModal from '@/components/builder/ShortcutsModal'

function BuilderSkeleton() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="skeleton" style={{ height: 56, borderRadius: 0 }} />
      <div style={{ flex: 1, display: 'flex' }}>
        <div className="skeleton" style={{ width: 264, borderRadius: 0, opacity: 0.6 }} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div className="skeleton" style={{ width: 240, height: 90 }} />
        </div>
      </div>
    </div>
  )
}

export default function BuilderPage() {
  const { toast } = useToast()
  const load = useWorkflow((s) => s.load)
  const [ready, setReady] = useState(false)
  const [help, setHelp] = useState(false)
  const loaded = useRef(false)

  useAutoSave()
  useKeyboard({
    onSave: () => { saveWorkflow(); toast('Workflow saved', 'success') },
    onToggleHelp: () => setHelp((h) => !h),
  })

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    // Only restore a previous canvas if the user explicitly saved before; fresh loads start empty.
    if (hasSavedWorkflow()) {
      const saved = loadSavedWorkflow()
      if (saved && saved.nodes.length) load({ name: saved.name, nodes: saved.nodes, edges: saved.edges })
    }
    const t = window.setTimeout(() => setReady(true), 350)
    return () => window.clearTimeout(t)
  }, [load])

  if (!ready) return <BuilderSkeleton />

  return (
    <ReactFlowProvider>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TopBar onHelp={() => setHelp(true)} />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <NodeSidebar />
          <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <BuilderCanvas />
            <ConfigPanel />
            <ExecutionPanel />
          </div>
        </div>
      </div>
      <ShortcutsModal open={help} onClose={() => setHelp(false)} />
    </ReactFlowProvider>
  )
}
