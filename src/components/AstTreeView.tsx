/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AstNode } from '../umfp-core/types';

interface AstTreeViewProps {
  node: AstNode;
  slotLabel?: string;
  depth?: number;
}

const CONSTRUCT_KINDS = new Set([
  'fraction',
  'radical',
  'absolute',
  'matrix',
  'determinant',
  'indexed_sum',
  'indexed_product',
  'integral',
  'limit',
  'equation_system',
]);

export const AstTreeView: React.FC<AstTreeViewProps> = ({
  node,
  slotLabel,
  depth = 0,
}) => {
  const [expanded, setExpanded] = useState(depth < 5);

  const slotEntries: Array<{ label: string; child: AstNode }> = [];
  if (node.slots && Object.keys(node.slots).length > 0) {
    for (const [k, v] of Object.entries(node.slots)) {
      if (Array.isArray(v)) {
        v.forEach((item, idx) => slotEntries.push({ label: `${k}[${idx}]`, child: item }));
      } else if (v) {
        slotEntries.push({ label: k, child: v });
      }
    }
  } else {
    node.children.forEach((c, idx) =>
      slotEntries.push({ label: `child[${idx}]`, child: c })
    );
  }

  const hasChildren = slotEntries.length > 0;
  const isConstruct = CONSTRUCT_KINDS.has(node.kind);

  return (
    <div className="font-mono text-xs leading-5">
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${
          hasChildren ? 'cursor-pointer hover:bg-slate-800/50' : ''
        }`}
        onClick={() => hasChildren && setExpanded((prev) => !prev)}
      >
        <span className="w-4 h-4 flex items-center justify-center text-slate-500 shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          )}
        </span>

        {slotLabel && (
          <span className="text-[11px] uppercase tracking-wider text-amber-400/90 font-semibold shrink-0">
            {slotLabel}:
          </span>
        )}

        <span
          className={`font-semibold ${
            isConstruct
              ? 'text-cyan-300'
              : node.kind === 'constant_ref'
              ? 'text-amber-300'
              : node.kind === 'group'
              ? 'text-indigo-300'
              : node.kind === 'unknown'
              ? 'text-rose-400'
              : 'text-slate-200'
          }`}
        >
          {node.kind}
        </span>

        {node.operator && (
          <span className="text-emerald-400 font-bold">"{node.operator}"</span>
        )}

        {node.value !== undefined && node.value !== '' && (
          <span className="text-slate-100 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
            {node.value}
          </span>
        )}

        {node.constantId && (
          <span className="text-[11px] text-amber-300/90">
            [{node.constantId}]
          </span>
        )}

        {node.representation && node.representation !== 'unknown' && isConstruct && (
          <span className="text-[11px] text-slate-400">
            [{node.representation}]
          </span>
        )}

        {node.metadata?.dimension && (
          <span className="text-[11px] text-slate-400">
            dim={String(node.metadata.dimension)}
          </span>
        )}

        {node.sourceSpan && (
          <span className="text-[10px] text-slate-600 ml-auto tabular-nums">
            @{node.sourceSpan.start}:{node.sourceSpan.end}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="ml-4 pl-3 border-l border-slate-800/90">
          {slotEntries.map((entry, idx) => (
            <AstTreeView
              key={`${entry.label}-${idx}`}
              node={entry.child}
              slotLabel={node.slots ? entry.label.toUpperCase() : undefined}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
