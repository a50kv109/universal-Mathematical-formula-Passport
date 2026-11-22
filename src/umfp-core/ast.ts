/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConstantById } from './constantRegistry';
import {
  AstNode,
  AstNodeKind,
  AstRepresentation,
  SourceSpan,
  StructuralConstructKind,
} from './types';

export function makeSpan(start: number, end: number): SourceSpan {
  return { start, end };
}

export function createNode(
  kind: AstNodeKind,
  options: Partial<Omit<AstNode, 'kind'>> = {}
): AstNode {
  return {
    kind,
    children: options.children ?? [],
    ...options,
  };
}

export function getChildNodes(node: AstNode): AstNode[] {
  const seen = new Set<AstNode>();
  const result: AstNode[] = [];

  const push = (n: AstNode | undefined) => {
    if (n && !seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  };

  for (const child of node.children) {
    push(child);
  }

  if (node.slots) {
    for (const value of Object.values(node.slots)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          push(item);
        }
      } else {
        push(value);
      }
    }
  }

  return result;
}

export function mapNodeConstructKind(kind: AstNodeKind): StructuralConstructKind | null {
  switch (kind) {
    case 'fraction':
      return 'FRACTION';
    case 'radical':
      return 'RADICAL';
    case 'absolute':
      return 'ABSOLUTE_VALUE';
    case 'matrix':
      return 'MATRIX';
    case 'determinant':
      return 'DETERMINANT';
    case 'indexed_sum':
      return 'INDEXED_SUM';
    case 'indexed_product':
      return 'INDEXED_PRODUCT';
    case 'integral':
      return 'INTEGRAL';
    case 'limit':
      return 'LIMIT';
    case 'equation_system':
      return 'EQUATION_SYSTEM';
    default:
      return null;
  }
}

/**
 * Produces a Normalized AST without mutating RAW AST.
 * - Unwraps purely grouping parentheses (`kind: 'group'`)
 * - Normalizes implicit square roots (`\sqrt{x}` -> explicit `index: 2` in normalizedAst)
 * - Preserves reference sharing between children and slots via memoization
 */
export function normalizeAst(
  node: AstNode,
  memo: WeakMap<AstNode, AstNode> = new WeakMap()
): AstNode {
  const cached = memo.get(node);
  if (cached) return cached;

  if (node.kind === 'group') {
    const inner =
      node.slots && !Array.isArray(node.slots.body)
        ? node.slots.body
        : node.children[0];
    if (inner) {
      const unwrapped = normalizeAst(inner, memo);
      memo.set(node, unwrapped);
      return unwrapped;
    }
  }

  if (node.kind === 'constant_ref' && node.constantId) {
    const reg = getConstantById(node.constantId);
    const result: AstNode = {
      kind: 'constant_ref',
      constantId: node.constantId,
      symbol: reg?.symbol ?? node.symbol ?? node.value,
      canonicalName: reg?.canonicalName ?? node.canonicalName,
      value: reg?.symbol ?? node.value,
      children: [],
      representation: node.representation ?? 'linear',
      raw: node.raw,
      ...(node.metadata ? { metadata: { ...node.metadata } } : {}),
    };
    memo.set(node, result);
    return result;
  }

  const normalizedChildren = node.children.map((c) => normalizeAst(c, memo));
  let normalizedSlots: Record<string, AstNode | AstNode[]> | undefined;

  if (node.slots) {
    normalizedSlots = {};
    for (const [key, val] of Object.entries(node.slots)) {
      if (Array.isArray(val)) {
        normalizedSlots[key] = val.map((item) => normalizeAst(item, memo));
      } else if (val) {
        normalizedSlots[key] = normalizeAst(val, memo);
      }
    }
  }

  let metadataCopy = node.metadata ? { ...node.metadata } : undefined;

  // Normalize RADICAL default index = 2 in normalizedAst (keeping rawAst intact)
  if (node.kind === 'radical') {
    const hasIndex = Boolean(normalizedSlots?.index);
    if (!hasIndex) {
      const defaultIdxNode = createNode('constant', {
        value: '2',
        raw: '2',
        representation: 'linear',
      });
      normalizedSlots = normalizedSlots ?? {};
      normalizedSlots.index = defaultIdxNode;
      normalizedChildren.unshift(defaultIdxNode);
      metadataCopy = {
        ...(metadataCopy ?? {}),
        degree: 2,
        indexSource: 'implicit_default',
        parity: 'even',
      };
    } else {
      const idx = normalizedSlots!.index;
      const numericDeg =
        !Array.isArray(idx) && idx.kind === 'constant'
          ? Number(idx.value)
          : !Array.isArray(idx) &&
            idx.kind === 'unary' &&
            idx.operator === '-' &&
            idx.children[0]?.kind === 'constant'
          ? -Number(idx.children[0].value)
          : null;
      if (numericDeg !== null) {
        const validInt = Number.isInteger(numericDeg) && numericDeg > 0;
        metadataCopy = {
          ...(metadataCopy ?? {}),
          degree: Number.isFinite(numericDeg) ? numericDeg : null,
          indexSource: 'explicit',
          parity: validInt ? (numericDeg % 2 === 0 ? 'even' : 'odd') : 'unknown',
        };
      } else {
        metadataCopy = {
          ...(metadataCopy ?? {}),
          degree: null,
          indexSource: 'symbolic',
          parity: 'unknown',
        };
      }
    }

    // Promote registered constant radicals sqrt(2) and sqrt(3) in normalizedAst (rawAst remains radical)
    const radSlot = normalizedSlots?.radicand;
    const idxSlot = normalizedSlots?.index;
    const isDegreeTwo =
      idxSlot && !Array.isArray(idxSlot) && idxSlot.kind === 'constant' && idxSlot.value === '2';
    if (isDegreeTwo && radSlot && !Array.isArray(radSlot) && radSlot.kind === 'constant') {
      const constId =
        radSlot.value === '2'
          ? 'MATH_CONST_SQRT2'
          : radSlot.value === '3'
          ? 'MATH_CONST_SQRT3'
          : null;
      if (constId) {
        const reg = getConstantById(constId);
        if (reg) {
          const promoted: AstNode = {
            kind: 'constant_ref',
            constantId: reg.constantId,
            symbol: reg.symbol,
            canonicalName: reg.canonicalName,
            value: reg.symbol,
            children: [],
            representation: node.representation ?? ('linear' as AstRepresentation),
            raw: node.raw,
            metadata: {
              ...(metadataCopy ?? {}),
              fromRadical: true,
            },
          };
          memo.set(node, promoted);
          return promoted;
        }
      }
    }
  }

  const result: AstNode = {
    kind: node.kind,
    value: node.value,
    operator: node.operator,
    children: normalizedChildren,
    ...(normalizedSlots ? { slots: normalizedSlots } : {}),
    representation: node.representation ?? ('unknown' as AstRepresentation),
    ...(metadataCopy ? { metadata: metadataCopy } : {}),
    raw: node.raw,
  };
  memo.set(node, result);
  return result;
}

/**
 * Renders a concise human-readable expression string from an AST node.
 */
export function astToString(node: AstNode): string {
  if (node.raw && node.raw.trim().length > 0) {
    return node.raw.trim();
  }
  switch (node.kind) {
    case 'constant':
    case 'variable':
      return node.value ?? '?';
    case 'constant_ref':
      return node.symbol ?? node.value ?? node.constantId ?? '?';
    case 'group': {
      const inner = node.slots?.body;
      return inner && !Array.isArray(inner) ? `(${astToString(inner)})` : '()';
    }
    case 'unary':
      return `${node.operator ?? ''}${node.children[0] ? astToString(node.children[0]) : ''}`;
    case 'binary':
    case 'relation': {
      const left = node.children[0] ? astToString(node.children[0]) : '';
      const right = node.children[1] ? astToString(node.children[1]) : '';
      return `${left} ${node.operator ?? ''} ${right}`;
    }
    case 'fraction': {
      const num = node.slots?.numerator;
      const den = node.slots?.denominator;
      const numStr = num && !Array.isArray(num) ? astToString(num) : '?';
      const denStr = den && !Array.isArray(den) ? astToString(den) : '?';
      return `(${numStr})/(${denStr})`;
    }
    case 'radical': {
      const rad = node.slots?.radicand;
      const idx = node.slots?.index;
      const radStr = rad && !Array.isArray(rad) ? astToString(rad) : '?';
      if (idx && !Array.isArray(idx)) {
        return `sqrt[${astToString(idx)}](${radStr})`;
      }
      return `sqrt(${radStr})`;
    }
    case 'absolute': {
      const op = node.slots?.operand;
      return `|${op && !Array.isArray(op) ? astToString(op) : '?'}|`;
    }
    default:
      return node.kind;
  }
}
