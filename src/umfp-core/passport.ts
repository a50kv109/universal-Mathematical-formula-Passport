/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { astToString, getChildNodes, mapNodeConstructKind, normalizeAst } from './ast';
import { getConstantById, toPassportConstantEntry } from './constantRegistry';
import { parseExpression } from './parser';
import {
  AstNode,
  DiagnosticMessage,
  DomainClassification,
  DomainConstraint,
  EffectiveNumberDomain,
  FormulaPassport,
  FractionAnalysis,
  LogicalOrganizationKind,
  MathematicalDomain,
  NumberDomain,
  ParseContext,
  PassportConstantEntry,
  StructuralConstructKind,
  StructuralFeatures,
  SymmetryStatus,
  VariableScopeEntry,
} from './types';

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function serializeAstCanonical(
  node: AstNode,
  alphaRename: boolean,
  varMap: Map<string, string> = new Map()
): string {
  const kind = node.kind;
  let head: string = kind;

  if (kind === 'variable') {
    const rawName = node.value ?? '?';
    if (alphaRename) {
      if (!varMap.has(rawName)) {
        varMap.set(rawName, `v${varMap.size}`);
      }
      head = `var:${varMap.get(rawName)}`;
    } else {
      head = `var:${rawName}`;
    }
  } else if (kind === 'constant') {
    head = `const:${node.value ?? '?'}`;
  } else if (kind === 'constant_ref') {
    head = `constref:${node.constantId ?? node.symbol ?? '?'}`;
  } else if (kind === 'function') {
    head = `fn:${node.value ?? '?'}`;
  } else if (kind === 'binary' || kind === 'unary' || kind === 'relation') {
    head = `${kind}:${node.operator ?? ''}`;
  }

  if (node.slots && Object.keys(node.slots).length > 0) {
    const slotParts = Object.entries(node.slots)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slotName, val]) => {
        if (Array.isArray(val)) {
          return `${slotName}=[${val.map((v) => serializeAstCanonical(v, alphaRename, varMap)).join(',')}]`;
        }
        return `${slotName}=${serializeAstCanonical(val, alphaRename, varMap)}`;
      });
    return `${head}{${slotParts.join(';')}}`;
  }

  if (node.children.length > 0) {
    return `${head}(${node.children
      .map((c) => serializeAstCanonical(c, alphaRename, varMap))
      .join(',')})`;
  }

  return head;
}

function cleanExprText(node: AstNode): string {
  const s = astToString(node).trim();
  if (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let wrapsWhole = true;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0) {
          wrapsWhole = false;
          break;
        }
      }
    }
    if (wrapsWhole) {
      return s.slice(1, -1).trim();
    }
  }
  return s;
}

function extractNumericConstant(node: AstNode): number | null {
  if (node.kind === 'constant') {
    const v = Number(node.value);
    return Number.isFinite(v) ? v : null;
  }
  if (node.kind === 'unary' && node.operator === '-' && node.children[0]) {
    const inner = extractNumericConstant(node.children[0]);
    return inner === null ? null : -inner;
  }
  if (node.kind === 'binary' && node.operator === '/' && node.children[0] && node.children[1]) {
    const l = extractNumericConstant(node.children[0]);
    const r = extractNumericConstant(node.children[1]);
    if (l === null || r === null || r === 0) return null;
    return l / r;
  }
  if (node.kind === 'fraction') {
    const num = node.slots?.numerator ?? node.children[0];
    const den = node.slots?.denominator ?? node.children[1];
    if (num && !Array.isArray(num) && den && !Array.isArray(den)) {
      const l = extractNumericConstant(num);
      const r = extractNumericConstant(den);
      if (l === null || r === null || r === 0) return null;
      return l / r;
    }
  }
  if (node.kind === 'group') {
    const inner = node.slots?.body ?? node.children[0];
    return inner && !Array.isArray(inner) ? extractNumericConstant(inner) : null;
  }
  return null;
}

function computeParenthesisDepth(rawNode: AstNode): number {
  const children = getChildNodes(rawNode);
  const childMax =
    children.length > 0
      ? Math.max(...children.map((c) => computeParenthesisDepth(c)))
      : 0;
  return (rawNode.kind === 'group' ? 1 : 0) + childMax;
}

function computeAstDepth(node: AstNode): number {
  const children = getChildNodes(node);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(computeAstDepth));
}

function getEffectiveConstructKind(node: AstNode): StructuralConstructKind | null {
  const direct = mapNodeConstructKind(node.kind);
  if (direct) return direct;
  if (node.kind === 'constant_ref' && node.metadata?.fromRadical === true) {
    return 'RADICAL';
  }
  return null;
}

function computeCompositionDepth(node: AstNode): number {
  const children = getChildNodes(node);
  const childMax =
    children.length > 0
      ? Math.max(...children.map(computeCompositionDepth))
      : 0;
  const selfWeight = getEffectiveConstructKind(node) !== null ? 1 : 0;
  return selfWeight + childMax;
}

function computeFractionDepth(node: AstNode): number {
  const children = getChildNodes(node);
  const childMax =
    children.length > 0
      ? Math.max(...children.map(computeFractionDepth))
      : 0;
  const selfWeight = node.kind === 'fraction' ? 1 : 0;
  return selfWeight + childMax;
}

function collectConstructsInSubtree(node: AstNode): StructuralConstructKind[] {
  const found = new Set<StructuralConstructKind>();
  const visit = (n: AstNode) => {
    const ck = getEffectiveConstructKind(n);
    if (ck) found.add(ck);
    for (const child of getChildNodes(n)) {
      visit(child);
    }
  };
  visit(node);
  return Array.from(found);
}

function hasSubOperations(node: AstNode): boolean {
  if (node.kind === 'variable' || node.kind === 'constant') {
    return false;
  }
  if (node.kind === 'group') {
    const inner = node.slots?.body;
    if (inner && !Array.isArray(inner)) {
      return hasSubOperations(inner);
    }
  }
  return true;
}

function isPurelyAlgebraicRationalSubtree(node: AstNode): boolean {
  const allowedKinds = new Set([
    'variable',
    'constant',
    'constant_ref',
    'binary',
    'unary',
    'group',
    'fraction',
    'relation',
  ]);
  if (!allowedKinds.has(node.kind)) {
    return false;
  }
  if (node.kind === 'binary' && node.operator === '^') {
    const exp = node.children[1];
    if (!exp || exp.kind !== 'constant' || !/^\d+$/.test(exp.value ?? '')) {
      return false;
    }
  }
  return getChildNodes(node).every(isPurelyAlgebraicRationalSubtree);
}

function collectVariables(node: AstNode): string[] {
  const vars = new Set<string>();
  const visit = (n: AstNode) => {
    if (n.kind === 'variable' && n.value) {
      vars.add(n.value);
    }
    for (const child of getChildNodes(n)) {
      visit(child);
    }
  };
  visit(node);
  return Array.from(vars).sort();
}

/**
 * Commutative-flattened structural signature used purely for structural symmetry checks.
 */
function serializeCommutativeNormalized(
  node: AstNode,
  subst: Record<string, string>
): string {
  if (node.kind === 'variable') {
    const name = node.value ?? '?';
    return `var:${subst[name] ?? name}`;
  }
  if (node.kind === 'constant') {
    return `const:${node.value ?? '?'}`;
  }
  if (node.kind === 'constant_ref') {
    return `constref:${node.constantId ?? node.symbol ?? '?'}`;
  }
  if (node.kind === 'binary' && (node.operator === '+' || node.operator === '*')) {
    const op = node.operator;
    const flatten = (n: AstNode): string[] => {
      if (n.kind === 'binary' && n.operator === op) {
        return [
          ...(n.children[0] ? flatten(n.children[0]) : []),
          ...(n.children[1] ? flatten(n.children[1]) : []),
        ];
      }
      return [serializeCommutativeNormalized(n, subst)];
    };
    const parts = flatten(node).sort();
    return `${op}(${parts.join(',')})`;
  }
  if (node.kind === 'binary' || node.kind === 'unary' || node.kind === 'relation') {
    return `${node.kind}:${node.operator ?? ''}(${node.children
      .map((c) => serializeCommutativeNormalized(c, subst))
      .join(',')})`;
  }
  if (node.slots && Object.keys(node.slots).length > 0) {
    const slotParts = Object.entries(node.slots)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${k}=[${v.map((item) => serializeCommutativeNormalized(item, subst)).join(',')}]`;
        }
        return `${k}=${serializeCommutativeNormalized(v, subst)}`;
      });
    return `${node.kind}{${slotParts.join(';')}}`;
  }
  return `${node.kind}(${node.children
    .map((c) => serializeCommutativeNormalized(c, subst))
    .join(',')})`;
}

function evaluateSymmetryStatus(node: AstNode, vars: string[]): SymmetryStatus {
  if (vars.length < 2) return 'unknown';

  // 1. Structural symmetry check under cyclic shift and adjacent transposition of variables
  // For identities like (a+b)^2 = a^2 + 2ab + b^2, examine LHS if both sides exist
  const target =
    node.kind === 'relation' && node.operator === '=' && node.children[0]
      ? node.children[0]
      : node;

  const baseSig = serializeCommutativeNormalized(target, {});

  // Check cyclic permutation + pairwise swap across variables
  const cyclicSubst: Record<string, string> = {};
  vars.forEach((v, idx) => {
    cyclicSubst[v] = vars[(idx + 1) % vars.length];
  });
  const swapFirstTwo: Record<string, string> = {
    [vars[0]]: vars[1],
    [vars[1]]: vars[0],
  };

  if (
    serializeCommutativeNormalized(target, cyclicSubst) === baseSig &&
    serializeCommutativeNormalized(target, swapFirstTwo) === baseSig
  ) {
    return 'structurally_symmetric';
  }

  return 'unknown';
}

function classifyLogicalOrganization(
  normalizedAst: AstNode,
  features: StructuralFeatures,
  symmetryStatus: SymmetryStatus
): LogicalOrganizationKind[] {
  const orgs = new Set<LogicalOrganizationKind>();
  const constructs = features.structuralConstructs;

  if (constructs.EQUATION_SYSTEM || normalizedAst.kind === 'relation') {
    orgs.add('EQUATION_RELATION');
  }
  if (constructs.INDEXED_SUM || constructs.INDEXED_PRODUCT) {
    orgs.add('INDEXED_AGGREGATION');
  }
  if (constructs.MATRIX) {
    orgs.add('MATRIX_TRANSFORMATION');
  }
  if (constructs.DETERMINANT) {
    orgs.add('DETERMINANT_STRUCTURE');
  }
  if (constructs.INTEGRAL) {
    orgs.add('INTEGRAL_TRANSFORMATION');
  }
  if (constructs.LIMIT) {
    orgs.add('LIMIT_PROCESS');
  }
  if (constructs.RADICAL) {
    orgs.add('RADICAL_DEPENDENCE');
  }

  if ((features.operations['^'] ?? 0) > 0) {
    orgs.add('POWER_DEPENDENCE');
  }

  if (features.maximumCompositionDepth >= 2) {
    orgs.add('COMPOSITION');
  }

  if (normalizedAst.kind === 'relation' && normalizedAst.operator === '=') {
    const rhs = normalizedAst.children[1];
    const lhs = normalizedAst.children[0];
    if (rhs && rhs.kind === 'constant' && lhs && collectVariables(lhs).length >= 2) {
      orgs.add('INVARIANT');
    }
  }

  const hasPowerOfSum = (n: AstNode): boolean => {
    if (
      n.kind === 'binary' &&
      n.operator === '^' &&
      n.children[0]?.kind === 'binary' &&
      (n.children[0].operator === '+' || n.children[0].operator === '-')
    ) {
      return true;
    }
    if (
      n.kind === 'binary' &&
      n.operator === '*' &&
      n.children.some((c) => c.kind === 'binary' && (c.operator === '+' || c.operator === '-'))
    ) {
      return true;
    }
    return getChildNodes(n).some(hasPowerOfSum);
  };

  if (hasPowerOfSum(normalizedAst)) {
    orgs.add('FACTORISATION');
  } else if (
    normalizedAst.kind === 'binary' &&
    normalizedAst.operator === '+' &&
    (features.operations['^'] ?? 0) > 0 &&
    !constructs.FRACTION &&
    !constructs.RADICAL
  ) {
    orgs.add('EXPANSION');
  }

  if (symmetryStatus === 'structurally_symmetric' || symmetryStatus === 'symbolically_proven') {
    orgs.add('SYMMETRY');
  }

  if (
    (constructs.FRACTION || (features.operations['/'] ?? 0) > 0) &&
    !constructs.RADICAL &&
    !constructs.INTEGRAL &&
    !constructs.LIMIT &&
    !constructs.MATRIX &&
    !constructs.DETERMINANT &&
    !constructs.INDEXED_SUM &&
    !constructs.INDEXED_PRODUCT &&
    isPurelyAlgebraicRationalSubtree(normalizedAst)
  ) {
    orgs.add('RATIONAL_EXPRESSION');
  }

  if (normalizedAst.kind === 'binary') {
    switch (normalizedAst.operator) {
      case '+':
        orgs.add('SUMMATION');
        break;
      case '-':
        orgs.add('DIFFERENCE');
        break;
      case '*':
        orgs.add('PRODUCT');
        break;
      case '/':
        orgs.add('QUOTIENT');
        break;
    }
  } else if (normalizedAst.kind === 'fraction' && !orgs.has('RATIONAL_EXPRESSION')) {
    orgs.add('QUOTIENT');
  }

  if (orgs.size === 0) {
    orgs.add('UNKNOWN');
  }

  return Array.from(orgs);
}

/**
 * Restricted UMFP 0.1.x Domain Classification: ONLY 'ALGEBRA' | 'GEOMETRY' | 'UNKNOWN'.
 */
function classifyDomain(
  normalizedAst: AstNode,
  features: StructuralFeatures,
  constants: PassportConstantEntry[],
  parseStatus: 'parsed' | 'partial' | 'failed',
  context: ParseContext
): DomainClassification {
  if (parseStatus === 'failed') {
    return {
      primaryDomain: 'UNKNOWN',
      confidence: 'high',
      classificationMethod: 'unknown',
      reasons: ['Expression failed to parse cleanly.'],
    };
  }

  if (context.domainHint && context.domainHint !== 'UNKNOWN') {
    return {
      primaryDomain: context.domainHint,
      confidence: 'high',
      classificationMethod: 'explicit_metadata',
      reasons: [`Explicit domain hint provided by caller: ${context.domainHint}.`],
    };
  }

  const constructs = features.structuralConstructs;
  const varSet = new Set(features.variables);
  const constantIds = new Set(constants.map((c) => c.constantId));

  // Known Geometric Identities (do NOT infer geometry solely from letters or from π/e alone)
  if (
    normalizedAst.kind === 'relation' &&
    normalizedAst.operator === '=' &&
    varSet.has('V') &&
    varSet.has('E') &&
    varSet.has('F') &&
    features.constantValues.includes('2')
  ) {
    return {
      primaryDomain: 'GEOMETRY',
      confidence: 'high',
      classificationMethod: 'known_identity',
      reasons: ['Recognized Euler polyhedron invariant V - E + F = 2.'],
    };
  }

  // Circle area S = pi * r^2 or A = pi * r^2
  if (
    normalizedAst.kind === 'relation' &&
    normalizedAst.operator === '=' &&
    constantIds.has('MATH_CONST_PI') &&
    varSet.has('r') &&
    (varSet.has('S') || varSet.has('A')) &&
    (features.operations['^'] ?? 0) === 1
  ) {
    return {
      primaryDomain: 'GEOMETRY',
      confidence: 'high',
      classificationMethod: 'known_identity',
      reasons: ['Recognized geometric circle area relation (pi * r^2).'],
    };
  }

  // Pythagorean relation a^2 + b^2 = c^2
  if (
    normalizedAst.kind === 'relation' &&
    normalizedAst.operator === '=' &&
    varSet.size === 3 &&
    varSet.has('a') &&
    varSet.has('b') &&
    varSet.has('c') &&
    (features.operations['^'] ?? 0) === 3 &&
    (features.operations['+'] ?? 0) === 1
  ) {
    return {
      primaryDomain: 'GEOMETRY',
      confidence: 'medium',
      classificationMethod: 'known_identity',
      reasons: ['Recognized Pythagorean theorem pattern a^2 + b^2 = c^2.'],
    };
  }

  // Constructs outside pure scalar ALGEBRA/GEOMETRY scope in 0.1.x -> UNKNOWN
  if (constructs.INTEGRAL || constructs.LIMIT || constructs.MATRIX || constructs.DETERMINANT) {
    return {
      primaryDomain: 'UNKNOWN',
      confidence: 'medium',
      classificationMethod: 'unknown',
      reasons: [
        'Construct belongs to calculus or linear algebra, which is restricted to UNKNOWN in UMFP 0.1.x domain scope.',
      ],
    };
  }

  // Transcendental / trigonometric functions without geometric/algebraic context -> UNKNOWN
  const hasFunctions = Object.keys(features.operations).some((k) => k.startsWith('fn:'));
  if (hasFunctions && !constructs.FRACTION && !constructs.RADICAL) {
    return {
      primaryDomain: 'UNKNOWN',
      confidence: 'low',
      classificationMethod: 'unknown',
      reasons: ['Contains general function application without explicit ALGEBRA/GEOMETRY domain context.'],
    };
  }

  // Algebraic structures over variables/constants
  const hasOps = Object.keys(features.operations).length > 0;
  const hasConstructs = Object.keys(constructs).length > 0;
  if (hasOps || hasConstructs) {
    return {
      primaryDomain: 'ALGEBRA',
      confidence: 'high',
      classificationMethod: 'structural_rules',
      reasons: ['Composed of scalar algebraic operations, fractions, radicals, or algebraic equations.'],
    };
  }

  return {
    primaryDomain: 'UNKNOWN',
    confidence: 'low',
    classificationMethod: 'unknown',
    reasons: ['Atomic identifier or constant without relational/algebraic structure.'],
  };
}

export function generatePassportFromAst(
  sourceExpression: string,
  rawAst: AstNode,
  parseStatus: 'parsed' | 'partial' | 'failed',
  inputDiagnostics: DiagnosticMessage[] = [],
  context: ParseContext = {}
): FormulaPassport {
  const requestedNumberDomain: NumberDomain = context.numberDomain ?? 'UNSPECIFIED';
  const diagnostics: DiagnosticMessage[] = [...inputDiagnostics];
  const normalizedAst = normalizeAst(rawAst);

  let constants = 0;
  const constantValueSet = new Set<string>();
  const variableSet = new Set<string>();
  const freeVariableSet = new Set<string>();
  const boundVariableSet = new Set<string>();
  const variableScopes: VariableScopeEntry[] = [];
  const activeScopes = new Map<string, VariableScopeEntry>();
  const registeredConstantCounts = new Map<string, number>();
  const operations: Record<string, number> = {};
  const structuralConstructs: Partial<Record<StructuralConstructKind, number>> = {};
  let nodeCount = 0;

  const visitNormalized = (
    node: AstNode,
    scopeDepth = 0,
    isBinderSlot = false
  ) => {
    nodeCount++;
    if (node.kind === 'constant') {
      constants++;
      if (node.value) constantValueSet.add(node.value);
    } else if (node.kind === 'constant_ref' && node.constantId) {
      registeredConstantCounts.set(
        node.constantId,
        (registeredConstantCounts.get(node.constantId) ?? 0) + 1
      );
    } else if (node.kind === 'variable') {
      if (node.value) {
        variableSet.add(node.value);
        if (isBinderSlot) {
          boundVariableSet.add(node.value);
        } else {
          const active = activeScopes.get(node.value);
          if (active) {
            active.boundOccurrenceCount++;
            active.unusedBinder = false;
          } else {
            freeVariableSet.add(node.value);
          }
        }
      }
    } else if (node.kind === 'binary' || node.kind === 'unary' || node.kind === 'relation') {
      const op = node.operator ?? node.kind;
      operations[op] = (operations[op] ?? 0) + 1;
    } else if (node.kind === 'function' && node.value) {
      operations[`fn:${node.value}`] = (operations[`fn:${node.value}`] ?? 0) + 1;
    }

    const constructKind = getEffectiveConstructKind(node);
    if (constructKind) {
      structuralConstructs[constructKind] = (structuralConstructs[constructKind] ?? 0) + 1;
    }

    if (
      node.kind === 'indexed_sum' ||
      node.kind === 'indexed_product' ||
      node.kind === 'integral' ||
      node.kind === 'limit'
    ) {
      const slots = node.slots ?? {};
      const binderSlotName =
        node.kind === 'indexed_sum' || node.kind === 'indexed_product'
          ? 'index'
          : 'variable';
      const scopeSlotName: 'body' | 'integrand' =
        node.kind === 'integral' ? 'integrand' : 'body';

      const binderRaw = slots[binderSlotName];
      const binderNode = !Array.isArray(binderRaw) ? binderRaw : undefined;
      const scopedRaw = slots[scopeSlotName];
      const scopedNode = !Array.isArray(scopedRaw) ? scopedRaw : undefined;

      const handled = new Set<AstNode>();
      if (binderNode) {
        handled.add(binderNode);
        visitNormalized(binderNode, scopeDepth, true);
      }

      const outerSlotNames =
        node.kind === 'limit'
          ? ['approach', 'direction']
          : ['lowerBound', 'upperBound'];
      for (const sName of outerSlotNames) {
        const sVal = slots[sName];
        if (sVal && !Array.isArray(sVal) && !handled.has(sVal)) {
          handled.add(sVal);
          visitNormalized(sVal, scopeDepth, false);
        }
      }

      if (scopedNode && !handled.has(scopedNode)) {
        handled.add(scopedNode);
        const binderName =
          binderNode?.kind === 'variable' && binderNode.value
            ? binderNode.value
            : null;
        if (binderName) {
          const prevEntry = activeScopes.get(binderName);
          const entry: VariableScopeEntry = {
            construct: constructKind as VariableScopeEntry['construct'],
            boundVariable: binderName,
            scopeSlot: scopeSlotName,
            depth: scopeDepth + 1,
            boundOccurrenceCount: 0,
            unusedBinder: true,
            shadowsOuter: prevEntry !== undefined,
          };
          variableScopes.push(entry);
          activeScopes.set(binderName, entry);
          visitNormalized(scopedNode, scopeDepth + 1, false);
          if (prevEntry !== undefined) {
            activeScopes.set(binderName, prevEntry);
          } else {
            activeScopes.delete(binderName);
          }
        } else {
          visitNormalized(scopedNode, scopeDepth, false);
        }
      }

      for (const child of getChildNodes(node)) {
        if (!handled.has(child)) {
          visitNormalized(child, scopeDepth, false);
        }
      }
      return;
    }

    for (const child of getChildNodes(node)) {
      visitNormalized(child, scopeDepth, false);
    }
  };

  visitNormalized(normalizedAst);

  const registeredConstants: PassportConstantEntry[] = [];
  if (parseStatus !== 'failed') {
    for (const [constantId, occ] of registeredConstantCounts.entries()) {
      const entry = getConstantById(constantId);
      if (entry && entry.kind !== 'NUMERIC_SPECIAL') {
        registeredConstants.push(toPassportConstantEntry(entry, occ));
      }
    }
  }

  const hasComplexConstant = registeredConstants.some((c) => c.numberDomain === 'COMPLEX');
  const requiredNumberDomain: EffectiveNumberDomain = hasComplexConstant ? 'COMPLEX' : 'REAL';
  const effectiveNumberDomain: EffectiveNumberDomain =
    requestedNumberDomain === 'COMPLEX' || requiredNumberDomain === 'COMPLEX'
      ? 'COMPLEX'
      : 'REAL';
  const numberDomain: NumberDomain = effectiveNumberDomain;

  if (requestedNumberDomain === 'REAL' && requiredNumberDomain === 'COMPLEX') {
    diagnostics.push({
      level: 'warning',
      code: 'NUMBER_DOMAIN_CONFLICT',
      message:
        'Expression contains COMPLEX constant(s) (e.g. MATH_CONST_I) while requested numberDomain is REAL; effective numberDomain promoted to COMPLEX.',
    });
  } else if (requestedNumberDomain === 'UNSPECIFIED' && requiredNumberDomain === 'COMPLEX') {
    diagnostics.push({
      level: 'info',
      code: 'COMPLEX_DOMAIN_INFERRED',
      message:
        'Effective numberDomain promoted to COMPLEX due to detected COMPLEX constant(s); complex branch semantics are unmodeled in UMFP 0.1.x.',
    });
  }

  const maximumDepth = parseStatus === 'failed' ? 0 : computeAstDepth(normalizedAst);
  const parenthesisDepth = parseStatus === 'failed' ? 0 : computeParenthesisDepth(rawAst);
  const maximumCompositionDepth =
    parseStatus === 'failed' ? 0 : computeCompositionDepth(normalizedAst);
  const maximumFractionDepth =
    parseStatus === 'failed' ? null : computeFractionDepth(normalizedAst);

  const freeVariables = Array.from(freeVariableSet).sort();
  const boundVariables = Array.from(boundVariableSet).sort();
  const variables = Array.from(new Set([...freeVariables, ...boundVariables, ...variableSet])).sort();

  const features: StructuralFeatures = {
    constants,
    constantValues: Array.from(constantValueSet),
    variables,
    freeVariables,
    boundVariables,
    variableScopes,
    operations,
    maximumDepth,
    parenthesisDepth,
    nodeCount,
    structuralConstructs,
    maximumCompositionDepth,
    maximumFractionDepth,
  };

  const fractionDetails: FractionAnalysis[] = [];
  const constraints: DomainConstraint[] = [];
  const seenConstraintKeys = new Set<string>();

  const addConstraint = (c: DomainConstraint) => {
    const key = `${c.kind}|${c.expression}|${c.status}`;
    if (!seenConstraintKeys.has(key)) {
      seenConstraintKeys.add(key);
      constraints.push(c);
    }
  };

  const visitRawForDetails = (node: AstNode) => {
    if (node.kind === 'fraction') {
      const numNode = node.slots?.numerator ?? node.children[0];
      const denNode = node.slots?.denominator ?? node.children[1];
      const numeratorRaw = numNode && !Array.isArray(numNode) ? cleanExprText(numNode) : '?';
      const denominatorRaw = denNode && !Array.isArray(denNode) ? cleanExprText(denNode) : '?';

      const numeratorConstructs =
        numNode && !Array.isArray(numNode) ? collectConstructsInSubtree(numNode) : [];
      const denominatorConstructs =
        denNode && !Array.isArray(denNode) ? collectConstructsInSubtree(denNode) : [];

      const hasNestedOperations =
        (numNode && !Array.isArray(numNode) && hasSubOperations(numNode)) ||
        (denNode && !Array.isArray(denNode) && hasSubOperations(denNode)) ||
        false;

      const denominatorConstraint = `${denominatorRaw} != 0`;
      const nestingDepth = computeFractionDepth(normalizeAst(node));

      fractionDetails.push({
        representation: node.representation ?? 'unknown',
        numeratorRaw,
        denominatorRaw,
        numeratorConstructs,
        denominatorConstructs,
        hasNestedOperations,
        nestingDepth,
        denominatorConstraint,
      });

      addConstraint({
        kind: 'nonzero_denominator',
        expression: denominatorConstraint,
        sourceConstruct: 'FRACTION',
        status: denominatorRaw === '0' ? 'invalid' : 'required',
      });

      const denVal = denNode && !Array.isArray(denNode) ? extractNumericConstant(denNode) : null;
      if (denominatorRaw === '0' || denVal === 0) {
        diagnostics.push({
          level: 'error',
          code: 'ZERO_DENOMINATOR',
          message: 'Denominator is identically 0; expression is undefined.',
          span: node.sourceSpan,
        });
      }
    } else if (node.kind === 'binary' && node.operator === '/') {
      const denNode = node.children[1];
      if (denNode) {
        const denClean = cleanExprText(denNode);
        const denVal = extractNumericConstant(denNode);
        addConstraint({
          kind: 'nonzero_denominator',
          expression: `${denClean} != 0`,
          sourceConstruct: 'BINARY_DIV',
          status: denClean === '0' || denVal === 0 ? 'invalid' : 'required',
        });
        if (denClean === '0' || denVal === 0) {
          diagnostics.push({
            level: 'error',
            code: 'ZERO_DENOMINATOR',
            message: 'Division by 0 detected; expression is undefined.',
            span: node.sourceSpan,
          });
        }
      }
    } else if (node.kind === 'radical') {
      const radNode = node.slots?.radicand ?? node.children[0];
      const idxNode = node.slots?.index;
      const radClean = radNode && !Array.isArray(radNode) ? cleanExprText(radNode) : '?';

      let degree: number | null = 2;
      if (idxNode && !Array.isArray(idxNode)) {
        degree = extractNumericConstant(idxNode);
      }

      if (idxNode && !Array.isArray(idxNode) && degree === null) {
        // Symbolic index e.g. \sqrt[n]{x} -> parity is unknown, do NOT assign x >= 0!
        addConstraint({
          kind: 'domain_unknown',
          expression: `${radClean} (index "${cleanExprText(idxNode)}" parity unknown)`,
          sourceConstruct: 'RADICAL',
          status: 'unknown',
          reason: 'RADICAL_INDEX_PARITY_UNKNOWN',
        });
      } else if (degree !== null && (!Number.isInteger(degree) || degree <= 0)) {
        diagnostics.push({
          level: 'error',
          code: 'INVALID_RADICAL_INDEX',
          message: `Invalid radical index (${degree}); radical degree must be a positive integer.`,
          span: node.sourceSpan,
        });
        addConstraint({
          kind: 'domain_unknown',
          expression: `${radClean} (invalid index ${degree})`,
          sourceConstruct: 'RADICAL',
          status: 'invalid',
          reason: 'INVALID_RADICAL_INDEX',
        });
      } else if (degree !== null && degree % 2 === 0) {
        const radNumeric =
          radNode && !Array.isArray(radNode) ? extractNumericConstant(radNode) : null;
        if (numberDomain === 'REAL') {
          if (radNumeric !== null && radNumeric < 0) {
            diagnostics.push({
              level: 'error',
              code: 'INVALID_DOMAIN',
              message: `Even-degree radical (${degree}) of negative value (${radNumeric}) is undefined in REAL domain.`,
              span: node.sourceSpan,
            });
            addConstraint({
              kind: 'radicand_domain',
              expression: `${radClean} >= 0`,
              sourceConstruct: 'RADICAL',
              status: 'invalid',
              reason: 'NEGATIVE_EVEN_RADICAND_IN_REAL',
            });
          } else if (radNumeric === null) {
            addConstraint({
              kind: 'radicand_domain',
              expression: `${radClean} >= 0`,
              sourceConstruct: 'RADICAL',
              status: 'domain_dependent',
            });
          }
        } else if (numberDomain === 'COMPLEX' && (radNumeric === null || radNumeric < 0)) {
          addConstraint({
            kind: 'domain_unknown',
            expression: `${radClean} (multi-valued branch in COMPLEX domain)`,
            sourceConstruct: 'RADICAL',
            status: 'unknown',
            reason: 'COMPLEX_BRANCH_UNMODELED',
          });
        }
      }
      // Odd positive integer degree (3, 5, ...) requires no radicand >= 0 constraint in REAL
    } else if (node.kind === 'absolute') {
      diagnostics.push({
        level: 'info',
        code: 'AMBIGUOUS_BAR_CONSTRUCT',
        message: 'Vertical bar construct |...| interpreted as ABSOLUTE_VALUE; could represent vector norm or cardinality depending on domain.',
        span: node.sourceSpan,
      });
    } else if (node.kind === 'determinant') {
      if (node.metadata?.squarenessVerified === false) {
        diagnostics.push({
          level: 'info',
          code: 'MATRIX_SQUARENESS_UNVERIFIED',
          message: 'Determinant requires a square matrix; symbolic argument dimension is unverified.',
          span: node.sourceSpan,
        });
      }
    }

    for (const child of getChildNodes(node)) {
      visitRawForDetails(child);
    }
  };

  if (parseStatus !== 'failed') {
    visitRawForDetails(rawAst);
  }

  const validationErrors = Array.from(
    new Set(diagnostics.filter((d) => d.level === 'error').map((d) => d.code))
  );

  const symmetryStatus: SymmetryStatus =
    parseStatus === 'failed'
      ? 'unknown'
      : evaluateSymmetryStatus(normalizedAst, features.freeVariables);

  const logicalOrganizations =
    parseStatus === 'failed'
      ? (['UNKNOWN'] as LogicalOrganizationKind[])
      : classifyLogicalOrganization(normalizedAst, features, symmetryStatus);

  const domainClassification = classifyDomain(
    normalizedAst,
    features,
    registeredConstants,
    parseStatus,
    context
  );
  const domains: MathematicalDomain[] = [domainClassification.primaryDomain];

  const domainTag =
    domainClassification.primaryDomain === 'ALGEBRA'
      ? 'ALG'
      : domainClassification.primaryDomain === 'GEOMETRY'
      ? 'GEO'
      : 'UNK';

  const canonicalExact = serializeAstCanonical(normalizedAst, false, new Map());
  const canonicalSchema = serializeAstCanonical(normalizedAst, true, new Map());

  const structuralId = `UMFP.STR.${domainTag}.${fnv1aHash(canonicalExact).slice(0, 6)}`;
  const structuralSchemaId = `UMFP.SCH.${domainTag}.${fnv1aHash(canonicalSchema).slice(0, 6)}`;

  const primaryLc = logicalOrganizations[0] ?? 'UNKNOWN';
  const lcSignature = logicalOrganizations.slice().sort().join('+');
  const logicalClassId = `UMFP.LC.${primaryLc}.${fnv1aHash(lcSignature).slice(0, 4)}`;

  return {
    umfpVersion: '0.1.x',
    sourceExpression,
    parseStatus,
    numberDomain,
    requestedNumberDomain,
    requiredNumberDomain,
    effectiveNumberDomain,
    structuralId,
    structuralSchemaId,
    canonicalExact,
    canonicalSchema,
    logicalClassId,
    constants: registeredConstants,
    features,
    fractionDetails,
    constraints,
    validationErrors,
    symmetryStatus,
    logicalOrganizations,
    domains,
    domainClassification,
    rawAst,
    normalizedAst,
    diagnostics,
  };
}

export function generatePassport(
  expression: string,
  context: ParseContext = {}
): FormulaPassport {
  const { rawAst, parseStatus, diagnostics } = parseExpression(expression, context);
  return generatePassportFromAst(expression, rawAst, parseStatus, diagnostics, context);
}
