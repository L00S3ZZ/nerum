'use client'

import { type NodeProps } from '@xyflow/react'
import BaseNode from './BaseNode'
import { KIND_COLOR, type NodeData } from '../catalog'

export default function ConditionNode({ id, data, selected }: NodeProps) {
  const d = data as NodeData
  const output = d.subtype === 'if_else' ? 'yesno' : 'single'
  return <BaseNode id={id} data={d} selected={!!selected} color={KIND_COLOR.condition} hasInput output={output} />
}
