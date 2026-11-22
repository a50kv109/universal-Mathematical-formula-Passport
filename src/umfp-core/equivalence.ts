/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getChildNodes } from './ast';
import { getConstantById } from './constantRegistry';
import { generatePassport } from './passport';
import {
  AstNode,
  EquivalenceReport,
  EquivalenceStatus,
  FormulaPassport,
  NumberDomain,
  ParseContext,
  ProofMethod,
} from './types';

// Deterministic per-slot numeric primes/reals (no charCodeAt % 7 collisions!)
const DETERMINISTIC_VALUE_TABLE = [
  [1.73, 2.41, 3.19, 4.07, 5.23, 6.11, 7.37, 8.29, 9.13, 10.47],
  [2.91, -1.43, 4.27, 1.19, -2.57, 3.83, 5.41, -3.17, 6.73, 1.97],
  [-2.23, 3.57, -1.31, 4.63, 2.19, 5.87, -4.09, 1.67, 3.43, -2.89],
  [0.83, 1.97, 2.71, 5.43, 3.11, 1.53, 4.37, 3.79, 6.23, 2.33],
  [4.51, 1.29, -2.63, 1.57, 2.93, 4.71, 2.13, 1.39, 3.89, 5.03],
  [3.17, 2.77, 1.49, 6.29, 1.13, 3.37, 1.79, 4.43, 2.69, 5.93],
];

function containsNonNumericConstructs(node: AstNode): boolean {
  const nonEvaluable = new Set([
    'matrix',
    'determinant',
    'indexed_sum',
    'indexed_product',
    'integral',
    'limit',
    'equation_system',
    'unknown',
  ]);
  if (nonEvaluable.has(node.kind)) return true;
  if (
    node.kind === 'function' &&
    !['sin', 'cos', 'tan', 'cot', 'ln', 'log', 'exp', 'sqrt', 'abs'].includes(node.value ?? '')
  ) {
    return true;
  }
  return getChildNodes(node).some(containsNonNumericConstructs);
}

function containsComplexConstant(node: AstNode): boolean {
  if (node.kind === 'constant_ref' && node.constantId) {
    const reg = getConstantById(node.constantId);
    if (reg?.numberDomain === 'COMPLEX' || reg?.kind === 'IMAGINARY_UNIT') {
      return true;
    }
  }
  return getChildNodes(node).some(containsComplexConstant);
}

function evaluateAst(
  node: AstNode,
  env: Record<string, number>,
  numberDomain: NumberDomain
): number | null {
  switch (node.kind) {
    case 'constant': {
      const v = Number(node.value);
      return Number.isFinite(v) ? v : null;
    }
    case 'constant_ref': {
      const reg = node.constantId ? getConstantById(node.constantId) : undefined;
      if (!reg || reg.kind === 'IMAGINARY_UNIT') return null;
      return typeof reg.approximation === 'number' ? reg.approximation : null;
    }
    case 'variable': {
      const name = node.value ?? '';
      return name in env ? env[name] : null;
    }
    case 'group': {
      const inner = node.slots?.body ?? node.children[0];
      return inner && !Array.isArray(inner)
        ? evaluateAst(inner, env, numberDomain)
        : null;
    }
    case 'unary': {
      const child = node.children[0];
      const val = child ? evaluateAst(child, env, numberDomain) : null;
      if (val === null) return null;
      return node.operator === '-' ? -val : val;
    }
    case 'binary': {
      const l = node.children[0]
        ? evaluateAst(node.children[0], env, numberDomain)
        : null;
      const r = node.children[1]
        ? evaluateAst(node.children[1], env, numberDomain)
        : null;
      if (l === null || r === null) return null;
      switch (node.operator) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return Math.abs(r) < 1e-10 ? null : l / r;
        case '^': {
          const res = Math.pow(l, r);
          return Number.isFinite(res) ? res : null;
        }
        default:
          return null;
      }
    }
    case 'fraction': {
      const num = node.slots?.numerator ?? node.children[0];
      const den = node.slots?.denominator ?? node.children[1];
      const l =
        num && !Array.isArray(num)
          ? evaluateAst(num, env, numberDomain)
          : null;
      const r =
        den && !Array.isArray(den)
          ? evaluateAst(den, env, numberDomain)
          : null;
      if (l === null || r === null || Math.abs(r) < 1e-10) return null;
      return l / r;
    }
    case 'radical': {
      const rad = node.slots?.radicand ?? node.children[0];
      const idxNode = node.slots?.index;
      const rVal =
        rad && !Array.isArray(rad)
          ? evaluateAst(rad, env, numberDomain)
          : null;
      if (rVal === null) return null;
      const idx =
        idxNode && !Array.isArray(idxNode)
          ? evaluateAst(idxNode, env, numberDomain)
          : 2;
      if (idx === null || !Number.isInteger(idx) || idx <= 0) return null;
      if (rVal < 0) {
        if (idx % 2 === 1) {
          return -Math.pow(-rVal, 1 / idx);
        }
        // Even root of negative number is undefined in REAL domain (complex branching unmodeled in 0.1.x)
        return null;
      }
      return Math.pow(rVal, 1 / idx);
    }
    case 'absolute': {
      const op = node.slots?.operand ?? node.children[0];
      const val =
        op && !Array.isArray(op)
          ? evaluateAst(op, env, numberDomain)
          : null;
      return val === null ? null : Math.abs(val);
    }
    case 'function': {
      const arg = node.children[0]
        ? evaluateAst(node.children[0], env, numberDomain)
        : null;
      if (arg === null) return null;
      switch (node.value) {
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'cot':
          return Math.abs(Math.sin(arg)) < 1e-10 ? null : Math.cos(arg) / Math.sin(arg);
        case 'ln':
          return arg > 0 ? Math.log(arg) : null;
        case 'log':
          return arg > 0 ? Math.log10(arg) : null;
        case 'exp':
          return Math.exp(arg);
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

export function canClaimProven(
  passportA: FormulaPassport,
  passportB: FormulaPassport
): boolean {
  return (
    passportA.parseStatus === 'parsed' &&
    passportB.parseStatus === 'parsed' &&
    passportA.validationErrors.length === 0 &&
    passportB.validationErrors.length === 0
  );
}

export function comparePassports(
  passportA: FormulaPassport,
  passportB: FormulaPassport
): EquivalenceReport {
  // 1. Structural Relation: check FULL canonical strings (hash is an index, NOT proof!)
  const structurallyIdentical = passportA.canonicalExact === passportB.canonicalExact;
  const schemaIsomorphic =
    !structurallyIdentical && passportA.canonicalSchema === passportB.canonicalSchema;

  const structuralStatus = structurallyIdentical
    ? 'identical'
    : schemaIsomorphic
    ? 'schema_isomorphic'
    : 'structurally_different';

  // 2. Logical Class Relation
  const orgsA = new Set(passportA.logicalOrganizations);
  const orgsB = new Set(passportB.logicalOrganizations);
  const sharedOrganizations = passportA.logicalOrganizations.filter(
    (o) => orgsB.has(o) && o !== 'UNKNOWN'
  );

  let logicalStatus: 'same_class' | 'overlapping' | 'disjoint' | 'unknown' = 'disjoint';
  if (
    passportA.logicalOrganizations.every((o) => o === 'UNKNOWN') ||
    passportB.logicalOrganizations.every((o) => o === 'UNKNOWN')
  ) {
    logicalStatus = 'unknown';
  } else if (passportA.logicalClassId === passportB.logicalClassId) {
    logicalStatus = 'same_class';
  } else if (sharedOrganizations.length > 0) {
    logicalStatus = 'overlapping';
  }

  // 3. Mathematical Equivalence with explicit proofMethod and validation guards
  const combinedValidationErrors = Array.from(
    new Set([...passportA.validationErrors, ...passportB.validationErrors])
  );

  let mathStatus: EquivalenceStatus = 'unknown';
  let proofMethod: ProofMethod = 'none';
  let mathDetails = 'Symbolic equivalence proof is not applicable or not yet verified.';
  let counterexample: Record<string, number> | undefined;
  let sampledPoints = 0;

  if (
    passportA.parseStatus === 'failed' ||
    passportB.parseStatus === 'failed'
  ) {
    mathStatus = 'not_applicable';
    proofMethod = 'not_applicable';
    mathDetails = 'Cannot verify equivalence because parsing failed for at least one expression.';
  } else if (combinedValidationErrors.length > 0) {
    mathStatus = 'not_applicable';
    proofMethod = 'none';
    mathDetails = `Equivalence blocked due to validation errors: ${combinedValidationErrors.join(', ')}.`;
  } else if (
    passportA.normalizedAst.kind === 'relation' ||
    passportB.normalizedAst.kind === 'relation' ||
    passportA.normalizedAst.kind === 'equation_system' ||
    passportB.normalizedAst.kind === 'equation_system'
  ) {
    if (structurallyIdentical && canClaimProven(passportA, passportB)) {
      mathStatus = 'proven';
      proofMethod = 'canonical_ast_normalization';
      mathDetails = 'Identical canonical normalized relation/system AST.';
    } else {
      mathStatus = 'not_applicable';
      proofMethod = 'not_applicable';
      mathDetails =
        'Relation / equation system equivalence requires symbolic solver (deferred to UMFP 0.2).';
    }
  } else if (structurallyIdentical && canClaimProven(passportA, passportB)) {
    mathStatus = 'proven';
    proofMethod = 'canonical_ast_normalization';
    mathDetails =
      'Full canonical normalized AST strings match exactly (normalized structure identity, e.g. stacked vs linear fraction, redundant parens, or implicit radical index 2).';
  } else if (
    containsNonNumericConstructs(passportA.normalizedAst) ||
    containsNonNumericConstructs(passportB.normalizedAst)
  ) {
    mathStatus = 'unknown';
    proofMethod = 'none';
    mathDetails =
      'Contains higher-order or symbolic constructs (integral, limit, matrix, determinant, indexed aggregation, or unmodeled function); symbolic CAS verification is deferred to UMFP 0.2.';
  } else if (
    passportA.effectiveNumberDomain === 'COMPLEX' ||
    passportB.effectiveNumberDomain === 'COMPLEX' ||
    passportA.numberDomain === 'COMPLEX' ||
    passportB.numberDomain === 'COMPLEX' ||
    containsComplexConstant(passportA.normalizedAst) ||
    containsComplexConstant(passportB.normalizedAst)
  ) {
    mathStatus = 'unknown';
    proofMethod = 'none';
    mathDetails =
      'Complex-domain branch semantics are not yet modeled in UMFP 0.1.x; numeric real sampling is skipped.';
  } else {
    // Deterministic numeric domain sampling (follows AST node semantics strictly)
    const varsA = passportA.features.freeVariables;
    const varsB = passportB.features.freeVariables;
    const freeVars = Array.from(new Set([...varsA, ...varsB])).sort();

    let matches = 0;
    for (let rowIdx = 0; rowIdx < DETERMINISTIC_VALUE_TABLE.length; rowIdx++) {
      const row = DETERMINISTIC_VALUE_TABLE[rowIdx];
      const env: Record<string, number> = {};
      freeVars.forEach((v, varIdx) => {
        const base = row[varIdx % row.length];
        const cycleShift = Math.floor(varIdx / row.length) * 0.137;
        env[v] = Number((base + cycleShift).toFixed(4));
      });

      const valA = evaluateAst(
        passportA.normalizedAst,
        env,
        passportA.effectiveNumberDomain
      );
      const valB = evaluateAst(
        passportB.normalizedAst,
        env,
        passportB.effectiveNumberDomain
      );
      if (valA === null || valB === null) continue;

      sampledPoints++;
      if (Math.abs(valA - valB) > 1e-6 * Math.max(1, Math.abs(valA), Math.abs(valB))) {
        mathStatus = 'refuted';
        proofMethod = 'numeric_sampling';
        counterexample = Object.fromEntries(
          freeVars.map((v) => [v, env[v]])
        );
        mathDetails = `Refuted at valid domain evaluation point: LHS=${valA.toFixed(6)}, RHS=${valB.toFixed(6)}.`;
        break;
      }
      matches++;
    }

    if (mathStatus !== 'refuted') {
      if (matches >= 3) {
        mathStatus = 'numerically_supported';
        proofMethod = 'numeric_sampling';
        mathDetails = `Expressions agreed across all ${matches} sampled valid domain points (numerical evidence only, NOT algebraic proof).`;
      } else {
        mathStatus = 'unknown';
        proofMethod = 'none';
        mathDetails = 'Insufficient valid evaluation points within real domain.';
      }
    }
  }

  return {
    structuralRelation: {
      status: structuralStatus,
      structuralIdA: passportA.structuralId,
      structuralIdB: passportB.structuralId,
      schemaIdA: passportA.structuralSchemaId,
      schemaIdB: passportB.structuralSchemaId,
      constructsA: passportA.features.structuralConstructs,
      constructsB: passportB.features.structuralConstructs,
      representationA: passportA.rawAst.representation ?? 'unknown',
      representationB: passportB.rawAst.representation ?? 'unknown',
    },
    logicalClassRelation: {
      status: logicalStatus,
      logicalClassIdA: passportA.logicalClassId,
      logicalClassIdB: passportB.logicalClassId,
      sharedOrganizations,
    },
    mathematicalEquivalence: {
      status: mathStatus,
      proofMethod,
      details: mathDetails,
      explanation: mathDetails,
      validationErrors: combinedValidationErrors,
      ...(counterexample ? { counterexample } : {}),
      ...(sampledPoints > 0 ? { sampledPoints } : {}),
    },
  };
}

export function compareExpressions(
  exprA: string,
  exprB: string,
  context: ParseContext = {}
): EquivalenceReport {
  const passportA = generatePassport(exprA, context);
  const passportB = generatePassport(exprB, context);
  return comparePassports(passportA, passportB);
}
