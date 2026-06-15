'use client'

import { type NodeProps } from '@xyflow/react'
import BaseNode from './BaseNode'
import { KIND_COLOR, type NodeData } from '../catalog'

export default function TriggerNode({ id, data, selected }: NodeProps) {
  return <BaseNode id={id} data={data as NodeData} selected={!!selected} color={KIND_COLOR.trigger} hasInput={false} output="single" />
}
