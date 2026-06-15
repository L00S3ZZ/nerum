'use client'

import { type NodeProps } from '@xyflow/react'
import BaseNode from './BaseNode'
import { KIND_COLOR, type NodeData } from '../catalog'

export default function AiNode({ id, data, selected }: NodeProps) {
  return <BaseNode id={id} data={data as NodeData} selected={!!selected} color={KIND_COLOR.ai} hasInput output="single" />
}
