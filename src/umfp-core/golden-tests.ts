/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConstantById, lookupNumericSpecial } from './constantRegistry';
import { compareExpressions } from './equivalence';
import { generatePassport } from './passport';
import { EquivalenceReport, FormulaPassport, ParseContext } from './types';

export interface GoldenTestCaseResult {
  id: string;
  category:
    | 'golden_construct'
    | 'fraction_special'
    | 'm1_regression'
    | 'equivalence_recovery'
    | 'radical_recovery'
    | 'parser_recovery'
    | 'domain_scope'
    | 'constant_registry'
    | 'variable_scope';
  expression: string;
  passed: boolean;
  details: string;
  passport?: FormulaPassport;
}

export interface GoldenTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: GoldenTestCaseResult[];
}

function assertCondition(cond: boolean, message: string, failures: string[]) {
  if (!cond) failures.push(message);
}

export function runAllGoldenTests(): GoldenTestSuiteSummary {
  const results: GoldenTestCaseResult[] = [];

  const checkPassportCase = (
    id: string,
    category: GoldenTestCaseResult['category'],
    expression: string,
    validate: (p: FormulaPassport, failures: string[]) => void,
    context: ParseContext = {}
  ) => {
    const p = generatePassport(expression, context);
    const failures: string[] = [];
    validate(p, failures);
    results.push({
      id,
      category,
      expression,
      passed: failures.length === 0,
      details:
        failures.length === 0
          ? `OK | parse=${p.parseStatus} | dom=${p.domains[0]} | str=${p.structuralId} | lc=${p.logicalClassId}`
          : failures.join('; '),
      passport: p,
    });
  };

  const checkCompareCase = (
    id: string,
    category: GoldenTestCaseResult['category'],
    exprA: string,
    exprB: string,
    validate: (cmp: EquivalenceReport, failures: string[]) => void,
    context: ParseContext = {}
  ) => {
    const cmp = compareExpressions(exprA, exprB, context);
    const failures: string[] = [];
    validate(cmp, failures);
    results.push({
      id,
      category,
      expression: `${exprA} vs ${exprB}`,
      passed: failures.length === 0,
      details:
        failures.length === 0
          ? `OK | struct=${cmp.structuralRelation.status} | math=${cmp.mathematicalEquivalence.status} | proof=${cmp.mathematicalEquivalence.proofMethod}`
          : failures.join('; '),
    });
  };

  // --- SECTION 21: GOLDEN TEST MATRIX (14 CONSTRUCTS) ---
  checkPassportCase('F01', 'golden_construct', '\\frac{a+b}{c-d}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'fraction', `Expected fraction root, got ${p.rawAst.kind}`, f);
    assertCondition(p.rawAst.representation === 'stacked', 'Expected stacked representation', f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 1, 'Expected FRACTION count 1', f);
    assertCondition(p.features.maximumFractionDepth === 1, 'Expected fraction depth 1', f);
    assertCondition(
      p.constraints.some(
        (c) =>
          c.kind === 'nonzero_denominator' &&
          c.expression.replace(/\s+/g, '').includes('c-d')
      ),
      'Expected denominator constraint c - d != 0',
      f
    );
  });

  checkPassportCase('F02', 'golden_construct', 'a/b', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'binary' && p.rawAst.operator === '/', 'Expected binary "/" node', f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 0, 'Expected FRACTION count 0 for atomic a/b', f);
    assertCondition(p.features.maximumFractionDepth === 0, 'Expected fraction depth 0', f);
    assertCondition(
      p.constraints.some((c) => c.kind === 'nonzero_denominator' && c.expression === 'b != 0'),
      'Expected b != 0 constraint',
      f
    );
  });

  checkPassportCase('F03', 'golden_construct', '\\frac{a}{\\frac{b}{c}}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 2, 'Expected FRACTION count 2', f);
    assertCondition(p.features.maximumFractionDepth === 2, 'Expected fraction depth 2', f);
    assertCondition(p.constraints.length >= 2, 'Expected denominator constraints for outer and inner fractions', f);
  });

  checkPassportCase('F04', 'golden_construct', '(a+b)/(c-d)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'fraction', 'Expected fraction root for grouped linear fraction', f);
    assertCondition(p.rawAst.representation === 'linear', 'Expected linear representation', f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 1, 'Expected FRACTION count 1', f);
    assertCondition(p.features.parenthesisDepth >= 1, 'Expected parenthesisDepth >= 1 in rawAst', f);
  });

  checkPassportCase('R01', 'golden_construct', '\\sqrt{x}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'radical', 'Expected radical root', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL count 1', f);
    assertCondition(
      p.constraints.some((c) => c.kind === 'radicand_domain'),
      'Expected radicand >= 0 constraint',
      f
    );
  });

  checkPassportCase('R02', 'golden_construct', '\\sqrt[3]{a+b}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'radical', 'Expected radical root', f);
    assertCondition(Boolean(p.rawAst.slots?.index), 'Expected radical index slot', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL count 1', f);
  });

  checkPassportCase('A01', 'golden_construct', '|a-b|', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'absolute', 'Expected absolute root', f);
    assertCondition((p.features.structuralConstructs.ABSOLUTE_VALUE ?? 0) === 1, 'Expected ABSOLUTE_VALUE count 1', f);
  });

  checkPassportCase('M01', 'golden_construct', '[[a,b],[c,d]]', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'matrix', 'Expected matrix root', f);
    assertCondition((p.features.structuralConstructs.MATRIX ?? 0) === 1, 'Expected MATRIX count 1', f);
    assertCondition(p.rawAst.metadata?.dimension === '2x2', 'Expected 2x2 matrix dimension metadata', f);
  });

  checkPassportCase('D01', 'golden_construct', 'det(A)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'determinant', 'Expected determinant root', f);
    assertCondition((p.features.structuralConstructs.DETERMINANT ?? 0) === 1, 'Expected DETERMINANT count 1', f);
  });

  checkPassportCase('S01', 'golden_construct', 'sum(i=1..n, a_i)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'indexed_sum', 'Expected indexed_sum root', f);
    assertCondition((p.features.structuralConstructs.INDEXED_SUM ?? 0) === 1, 'Expected INDEXED_SUM count 1', f);
    assertCondition(Boolean(p.rawAst.slots?.index && p.rawAst.slots?.body), 'Expected index and body slots', f);
  });

  checkPassportCase('P01', 'golden_construct', 'prod(i=1..n, a_i)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'indexed_product', 'Expected indexed_product root', f);
    assertCondition((p.features.structuralConstructs.INDEXED_PRODUCT ?? 0) === 1, 'Expected INDEXED_PRODUCT count 1', f);
  });

  checkPassportCase('I01', 'golden_construct', 'int(a,b,f(x),x)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'integral', 'Expected integral root', f);
    assertCondition((p.features.structuralConstructs.INTEGRAL ?? 0) === 1, 'Expected INTEGRAL count 1', f);
    assertCondition(Boolean(p.rawAst.slots?.integrand && p.rawAst.slots?.variable), 'Expected integrand & variable slots', f);
  });

  checkPassportCase('L01', 'golden_construct', 'lim(x->a,f(x))', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'limit', 'Expected limit root', f);
    assertCondition((p.features.structuralConstructs.LIMIT ?? 0) === 1, 'Expected LIMIT count 1', f);
    assertCondition(Boolean(p.rawAst.slots?.variable && p.rawAst.slots?.approach && p.rawAst.slots?.body), 'Expected variable/approach/body slots', f);
  });

  checkPassportCase('E01', 'golden_construct', '{x+y=5, x-y=1}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'equation_system', 'Expected equation_system root', f);
    assertCondition((p.features.structuralConstructs.EQUATION_SYSTEM ?? 0) === 1, 'Expected EQUATION_SYSTEM count 1', f);
    assertCondition(p.rawAst.children.length === 2, 'Expected 2 equations in system', f);
  });

  // --- SECTION 22: 10 MANDATORY FRACTION COMPOSITION CHECKS ---
  checkPassportCase('FRAC-01', 'fraction_special', '\\frac{a}{b}', (p, f) => {
    assertCondition(p.rawAst.kind === 'fraction' && p.rawAst.representation === 'stacked', 'Simple stacked fraction', f);
  });

  checkPassportCase('FRAC-02', 'fraction_special', '\\frac{a+b}{c-d}', (p, f) => {
    assertCondition(p.fractionDetails[0]?.hasNestedOperations === true, 'Fraction with operations in num/den', f);
  });

  checkPassportCase('FRAC-03', 'fraction_special', '\\frac{\\frac{a}{b}}{c}', (p, f) => {
    assertCondition(p.features.maximumFractionDepth === 2, 'Fraction inside numerator has depth 2', f);
  });

  checkPassportCase('FRAC-04', 'fraction_special', '\\frac{a}{\\frac{b}{c}}', (p, f) => {
    assertCondition(p.features.maximumFractionDepth === 2, 'Fraction inside denominator has depth 2', f);
  });

  checkPassportCase('FRAC-05', 'fraction_special', '\\frac{(a+b)*(c-d)}{x^2+1}', (p, f) => {
    assertCondition(p.features.parenthesisDepth >= 1, 'Parentheses inside numerator counted in rawAst', f);
    assertCondition(p.constraints.some((c) => c.expression.includes('x^2 + 1') || c.expression.includes('x^2+1')), 'Denominator constraint captured', f);
  });

  checkPassportCase('FRAC-06', 'fraction_special', '\\frac{\\sqrt{a+b}}{c}', (p, f) => {
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 1 && (p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Radical inside numerator', f);
    assertCondition(p.features.maximumCompositionDepth === 2, 'Composition depth = 2 (FRACTION -> RADICAL)', f);
    assertCondition(!p.logicalOrganizations.includes('RATIONAL_EXPRESSION'), 'Must NOT falsely classify radical numerator as RATIONAL_EXPRESSION', f);
  });

  checkPassportCase('FRAC-07', 'fraction_special', '\\frac{a}{\\sqrt{b}}', (p, f) => {
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Radical inside denominator', f);
    assertCondition(p.constraints.length >= 2, 'Expected both nonzero denominator and radicand domain constraints', f);
  });

  checkPassportCase('FRAC-08', 'fraction_special', '\\frac{1}{x} + \\frac{1}{y} = \\frac{1}{z}', (p, f) => {
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 3, 'Expected 3 fractions in equation', f);
    assertCondition(p.constraints.length === 3, 'Expected 3 denominator constraints (x!=0, y!=0, z!=0)', f);
  });

  checkPassportCase('FRAC-09', 'fraction_special', 'f(\\frac{a}{b})', (p, f) => {
    assertCondition(p.rawAst.kind === 'function' && (p.features.structuralConstructs.FRACTION ?? 0) === 1, 'Fraction inside function call', f);
  });

  checkPassportCase('FRAC-10', 'fraction_special', '\\frac{\\sqrt{a+b}}{\\frac{c+d}{e}}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 2, 'Expected 2 fractions', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected 1 radical', f);
    assertCondition(p.features.maximumFractionDepth === 2, 'Expected maximumFractionDepth = 2', f);
    assertCondition(p.features.maximumCompositionDepth === 2, 'Expected maximumCompositionDepth = 2', f);
  });

  checkCompareCase(
    'CMP-FRAC-LIN-STACK',
    'fraction_special',
    '\\frac{a+b}{c-d}',
    '(a+b)/(c-d)',
    (cmp, f) => {
      assertCondition(cmp.structuralRelation.status === 'identical', 'Expected identical structural relation', f);
      assertCondition(cmp.structuralRelation.representationA === 'stacked', 'Expected stacked A', f);
      assertCondition(cmp.structuralRelation.representationB === 'linear', 'Expected linear B', f);
      assertCondition(cmp.mathematicalEquivalence.status === 'proven', 'Expected proven equivalence', f);
      assertCondition(cmp.mathematicalEquivalence.proofMethod === 'canonical_ast_normalization', 'Expected canonical_ast_normalization proofMethod', f);
    }
  );

  // --- M1 BASELINE REGRESSION (WITH REAL AST & DOMAIN ASSERTIONS) ---
  checkPassportCase('M1-01', 'm1_regression', 'a+b*c', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.kind === 'binary' && p.rawAst.operator === '+', 'Root must be "+"', f);
    assertCondition(p.rawAst.children[0]?.kind === 'variable' && p.rawAst.children[0].value === 'a', 'Left child must be "a"', f);
    assertCondition(p.rawAst.children[1]?.kind === 'binary' && p.rawAst.children[1].operator === '*', 'Right child must be "b*c"', f);
    assertCondition(p.features.parenthesisDepth === 0, 'Expected parenthesisDepth 0', f);
    assertCondition(p.domains[0] === 'ALGEBRA', `Expected ALGEBRA, got ${p.domains[0]}`, f);
  });

  checkPassportCase('M1-02', 'm1_regression', '(a+b)*c', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.kind === 'binary' && p.rawAst.operator === '*', 'Root must be "*"', f);
    assertCondition(p.rawAst.children[0]?.kind === 'group', 'Left child in rawAst must be group', f);
    assertCondition(p.normalizedAst.children[0]?.kind === 'binary' && p.normalizedAst.children[0].operator === '+', 'Left child in normalizedAst must be "+"', f);
    assertCondition(p.features.parenthesisDepth === 1, 'Expected parenthesisDepth 1', f);
    assertCondition(p.domains[0] === 'ALGEBRA', `Expected ALGEBRA, got ${p.domains[0]}`, f);
  });

  checkPassportCase('M1-03', 'm1_regression', '(a+b)^2', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.kind === 'binary' && p.rawAst.operator === '^', 'Root must be "^"', f);
    assertCondition(p.normalizedAst.children[0]?.kind === 'binary' && p.normalizedAst.children[0].operator === '+', 'Base in normalizedAst must be "a+b"', f);
    assertCondition(p.normalizedAst.children[1]?.kind === 'constant' && p.normalizedAst.children[1].value === '2', 'Exponent must be 2', f);
    assertCondition(p.symmetryStatus === 'structurally_symmetric', `Expected structurally_symmetric, got ${p.symmetryStatus}`, f);
  });

  checkPassportCase('M1-04', 'm1_regression', 'a^2+2ab+b^2', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.kind === 'binary' && p.rawAst.operator === '+', 'Root must be "+"', f);
    assertCondition((p.features.operations['^'] ?? 0) === 2, 'Expected 2 power operators', f);
    assertCondition((p.features.operations['*'] ?? 0) === 2, 'Expected 2 implicit multiplications in 2*a*b', f);
    assertCondition(p.features.variables.join(',') === 'a,b', 'Expected variables a,b', f);
    assertCondition(p.symmetryStatus === 'structurally_symmetric', `Expected structurally_symmetric, got ${p.symmetryStatus}`, f);
  });

  checkPassportCase('M1-05', 'm1_regression', 'V-E+F=2', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.kind === 'relation' && p.rawAst.operator === '=', 'Root must be "=" relation', f);
    assertCondition(p.domains[0] === 'GEOMETRY', `Expected GEOMETRY for Euler invariant, got ${p.domains[0]}`, f);
    assertCondition(p.domainClassification.classificationMethod === 'known_identity', 'Expected known_identity domain classification', f);
  });

  // --- RECOVERY SUITE: MATHEMATICAL EQUIVALENCE INTEGRITY (§2, §11, §12) ---
  checkCompareCase('EQ-01', 'equivalence_recovery', '1/0', '1/0', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'not_applicable', `1/0 vs 1/0 must be not_applicable, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'none', `Expected proofMethod=none, got ${cmp.mathematicalEquivalence.proofMethod}`, f);
    assertCondition(cmp.mathematicalEquivalence.validationErrors.includes('ZERO_DENOMINATOR'), 'Expected ZERO_DENOMINATOR validation error', f);
  });

  checkCompareCase('EQ-02', 'equivalence_recovery', 'a+b', 'a+b', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'proven', `Expected proven, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'canonical_ast_normalization', 'Expected canonical_ast_normalization', f);
    assertCondition(cmp.mathematicalEquivalence.validationErrors.length === 0, 'Expected zero validationErrors', f);
  });

  checkCompareCase('EQ-03', 'equivalence_recovery', '(a+b)^2', 'a^2+2ab+b^2', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'numerically_supported', `Expected numerically_supported, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
    assertCondition((cmp.mathematicalEquivalence.sampledPoints ?? 0) >= 3, 'Expected >= 3 sampled points', f);
  });

  checkCompareCase('EQ-04', 'equivalence_recovery', 'exp(x)', 'e^x', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'numerically_supported', `Expected numerically_supported for exp(x) vs e^x, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
  });

  checkCompareCase('EQ-05', 'equivalence_recovery', 'a+b', 'a-b', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `Expected refuted, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
    assertCondition(Boolean(cmp.mathematicalEquivalence.counterexample), 'Expected counterexample point', f);
  });

  checkPassportCase('EQ-06', 'equivalence_recovery', 'a+b+c', (p, f) => {
    assertCondition(p.symmetryStatus === 'structurally_symmetric', `Expected structurally_symmetric for 3-variable a+b+c, got ${p.symmetryStatus}`, f);
    assertCondition(p.logicalOrganizations.includes('SYMMETRY'), 'Expected SYMMETRY logical organization', f);
  });

  // --- RECOVERY SUITE: RADICAL SEMANTICS (§3) ---
  checkCompareCase('RAD-01', 'radical_recovery', '\\sqrt{x}', '\\sqrt[2]{x}', (cmp, f) => {
    assertCondition(cmp.structuralRelation.status === 'identical', `Expected identical normalized structure, got ${cmp.structuralRelation.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.status === 'proven', `Expected proven, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'canonical_ast_normalization', 'Expected canonical_ast_normalization', f);
    const pDefault = generatePassport('\\sqrt{x}');
    const pExplicit = generatePassport('\\sqrt[2]{x}');
    assertCondition(!pDefault.rawAst.slots?.index, 'rawAst of \\sqrt{x} must omit explicit index slot', f);
    assertCondition(Boolean(pExplicit.rawAst.slots?.index), 'rawAst of \\sqrt[2]{x} must keep explicit index slot', f);
    assertCondition(
      !Array.isArray(pDefault.normalizedAst.slots?.index) && pDefault.normalizedAst.slots?.index?.value === '2',
      'normalizedAst of \\sqrt{x} must normalize index=2',
      f
    );
  });

  checkPassportCase(
    'RAD-02',
    'radical_recovery',
    '\\sqrt[3]{x}',
    (p, f) => {
      assertCondition(p.constraints.length === 0, 'Odd root \\sqrt[3]{x} must NOT force x >= 0 in REAL', f);
      assertCondition(p.normalizedAst.metadata?.parity === 'odd', 'Expected parity=odd', f);
      assertCondition(p.validationErrors.length === 0, 'Expected no validation errors', f);
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase(
    'RAD-03',
    'radical_recovery',
    '\\sqrt[4]{x}',
    (p, f) => {
      assertCondition(
        p.constraints.some((c) => c.kind === 'radicand_domain' && c.expression === 'x >= 0'),
        'Even root \\sqrt[4]{x} must require x >= 0 in REAL',
        f
      );
      assertCondition(p.normalizedAst.metadata?.parity === 'even', 'Expected parity=even', f);
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase(
    'RAD-04',
    'radical_recovery',
    '\\sqrt[n]{x}',
    (p, f) => {
      assertCondition(
        !p.constraints.some((c) => c.kind === 'radicand_domain'),
        'Symbolic index \\sqrt[n]{x} must NOT assume x >= 0',
        f
      );
      assertCondition(
        p.constraints.some((c) => c.kind === 'domain_unknown' && c.reason === 'RADICAL_INDEX_PARITY_UNKNOWN'),
        'Expected domain_unknown with RADICAL_INDEX_PARITY_UNKNOWN',
        f
      );
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase('RAD-05', 'radical_recovery', '\\sqrt[0]{x}', (p, f) => {
    assertCondition(p.validationErrors.includes('INVALID_RADICAL_INDEX'), 'Expected INVALID_RADICAL_INDEX for degree 0', f);
  });

  checkPassportCase('RAD-06', 'radical_recovery', '\\sqrt[-2]{x}', (p, f) => {
    assertCondition(p.validationErrors.includes('INVALID_RADICAL_INDEX'), 'Expected INVALID_RADICAL_INDEX for degree -2', f);
  });

  checkPassportCase('RAD-07', 'radical_recovery', '\\sqrt[1/2]{x}', (p, f) => {
    assertCondition(p.validationErrors.includes('INVALID_RADICAL_INDEX'), 'Expected INVALID_RADICAL_INDEX for non-integer degree 1/2', f);
  });

  checkPassportCase(
    'RAD-08',
    'radical_recovery',
    '\\sqrt{-1}',
    (p, f) => {
      assertCondition(p.validationErrors.includes('INVALID_DOMAIN'), 'Expected INVALID_DOMAIN for \\sqrt{-1} in REAL', f);
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase(
    'RAD-09',
    'radical_recovery',
    '\\sqrt{-1}',
    (p, f) => {
      assertCondition(p.validationErrors.length === 0, 'Expected no INVALID_DOMAIN error in COMPLEX', f);
      assertCondition(
        p.constraints.some((c) => c.reason === 'COMPLEX_BRANCH_UNMODELED'),
        'Expected COMPLEX_BRANCH_UNMODELED constraint status in COMPLEX',
        f
      );
    },
    { numberDomain: 'COMPLEX' }
  );

  // --- RECOVERY SUITE: PARSER FIXES (§4 - §10) ---
  checkPassportCase('PRS-01', 'parser_recovery', 'x1 + x2 + 2ab', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.features.variables.includes('x1') && p.features.variables.includes('x2'), 'Expected indexed variables x1, x2', f);
    assertCondition(p.features.variables.includes('a') && p.features.variables.includes('b'), 'Expected implicit multiplication split 2*a*b', f);
  });

  checkPassportCase('PRS-02', 'parser_recovery', '\\sin^{2}(x)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.features.operations['fn:sin'] === 1, 'Expected fn:sin', f);
    assertCondition(p.features.operations['^'] === 1, 'Expected power ^ 2', f);
    assertCondition(p.normalizedAst.metadata?.functionPower === true, 'Expected functionPower metadata', f);
  });

  checkPassportCase('PRS-03', 'parser_recovery', 'sin x + cos x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.features.operations['fn:sin'] === 1 && p.features.operations['fn:cos'] === 1, 'Expected sin and cos functions without parens', f);
    assertCondition(p.features.variables.join(',') === 'x', 'Expected argument variable x', f);
  });

  checkPassportCase('PRS-04', 'parser_recovery', 'a(b+c)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(
      p.diagnostics.some((d) => d.code === 'AMBIGUOUS_FUNCTION_OR_MULTIPLICATION'),
      'Default undeclared a(b+c) must emit AMBIGUOUS_FUNCTION_OR_MULTIPLICATION diagnostic',
      f
    );
    const pVar = generatePassport('a(b+c)', { declaredVariables: ['a', 'b', 'c'] });
    assertCondition(
      pVar.rawAst.kind === 'binary' && pVar.rawAst.operator === '*' && pVar.rawAst.metadata?.implicit === true,
      'With declaredVariables=["a"], a(b+c) must parse as implicit multiplication',
      f
    );
  });

  checkPassportCase('PRS-05', 'parser_recovery', '|a+|b||', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Nested |a+|b|| must parse cleanly, got ${p.parseStatus}`, f);
    assertCondition((p.features.structuralConstructs.ABSOLUTE_VALUE ?? 0) === 2, 'Expected 2 nested ABSOLUTE_VALUE nodes', f);
    const pLatex = generatePassport('\\left|a+\\left|b\\right|\\right|');
    assertCondition(pLatex.parseStatus === 'parsed' && (pLatex.features.structuralConstructs.ABSOLUTE_VALUE ?? 0) === 2, 'Expected \\left|...\\right| nested parse', f);
    const pUnclosed = generatePassport('|a+|b|');
    assertCondition(pUnclosed.parseStatus === 'failed', 'Unclosed |a+|b| must fail cleanly', f);
  });

  checkPassportCase('PRS-06', 'parser_recovery', '\\int_0^1 x\\,dx = \\frac{1}{3}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'relation' && p.rawAst.operator === '=', 'Root must be relation "="', f);
    assertCondition((p.features.structuralConstructs.INTEGRAL ?? 0) === 1, 'Expected 1 INTEGRAL', f);
    assertCondition((p.features.structuralConstructs.FRACTION ?? 0) === 1, 'Expected 1 FRACTION', f);
    const pSum = generatePassport('a+\\int_0^1 x\\,dx');
    assertCondition(pSum.parseStatus === 'parsed' && (pSum.features.structuralConstructs.INTEGRAL ?? 0) === 1, 'Expected a + integral to parse', f);
    const pCoeff = generatePassport('\\frac{1}{2}\\int_0^1 x\\,dx');
    assertCondition(pCoeff.parseStatus === 'parsed' && (pCoeff.features.structuralConstructs.INTEGRAL ?? 0) === 1 && (pCoeff.features.structuralConstructs.FRACTION ?? 0) === 1, 'Expected fraction * integral to parse', f);
  });

  checkPassportCase('PRS-07', 'parser_recovery', '1/2x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(
      p.diagnostics.some((d) => d.code === 'AMBIGUOUS_DIVISION_WITH_IMPLICIT_MULTIPLICATION'),
      'Expected AMBIGUOUS_DIVISION_WITH_IMPLICIT_MULTIPLICATION diagnostic on 1/2x',
      f
    );
  });

  // --- RECOVERY SUITE: DOMAIN SCOPE RESTRICTION (§0) ---
  checkPassportCase('DOM-SCOPE-01', 'domain_scope', 'a + b + x + y', (p, f) => {
    const allowed = new Set(['ALGEBRA', 'GEOMETRY', 'UNKNOWN']);
    assertCondition(p.domains.every((d) => allowed.has(d)), 'All domains must be strictly ALGEBRA | GEOMETRY | UNKNOWN', f);
    assertCondition(p.domains[0] === 'ALGEBRA', `Letters a,b,x,y must NOT infer GEOMETRY; expected ALGEBRA, got ${p.domains[0]}`, f);
    const pGeom = generatePassport('a^2 + b^2 = c^2');
    assertCondition(pGeom.domains[0] === 'GEOMETRY', `Expected GEOMETRY for Pythagorean pattern, got ${pGeom.domains[0]}`, f);
    const pInt = generatePassport('int(a,b,f(x),x)');
    assertCondition(pInt.domains[0] === 'UNKNOWN', `Integral must fall into UNKNOWN in 0.1.x domain scope, got ${pInt.domains[0]}`, f);
  });

  // --- CONSTANT REGISTRY INTEGRATION TESTS (CR-01 .. CR-30) ---
  checkPassportCase('CR-01', 'constant_registry', 'πr^2', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_PI'), 'Expected MATH_CONST_PI', f);
    assertCondition(p.features.variables.join(',') === 'r', `Expected only variable r, got ${p.features.variables.join(',')}`, f);
  });

  checkPassportCase('CR-02', 'constant_registry', '\\pi r^2', (p, f) => {
    const pUnicode = generatePassport('πr^2');
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_PI'), 'Expected MATH_CONST_PI', f);
    assertCondition(p.canonicalExact === pUnicode.canonicalExact, 'Expected identical canonicalExact for \\pi r^2 and πr^2', f);
  });

  checkPassportCase('CR-03', 'constant_registry', 'e^x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_E'), 'Expected MATH_CONST_E', f);
    assertCondition(p.features.variables.join(',') === 'x', 'Expected variable x', f);
  });

  checkPassportCase('CR-04', 'constant_registry', 'φ^2 = φ + 1', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    const phi = p.constants.find((c) => c.constantId === 'MATH_CONST_PHI');
    assertCondition(Boolean(phi), 'Expected MATH_CONST_PHI', f);
    assertCondition(phi?.occurrences === 2, `Expected 2 occurrences of PHI, got ${phi?.occurrences}`, f);
  });

  checkPassportCase('CR-05', 'constant_registry', '\\varphi^2 = \\varphi + 1', (p, f) => {
    const pUni = generatePassport('φ^2 = φ + 1');
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_PHI'), 'Expected MATH_CONST_PHI', f);
    assertCondition(p.canonicalExact === pUni.canonicalExact, 'Expected identical canonicalExact for \\varphi and φ', f);
  });

  checkPassportCase('CR-06', 'constant_registry', 'sqrt(2) + x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_SQRT2'), 'Expected MATH_CONST_SQRT2', f);
    assertCondition(p.features.variables.join(',') === 'x', 'Expected variable x', f);
  });

  checkPassportCase('CR-07', 'constant_registry', 'sqrt(3) + y', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_SQRT3'), 'Expected MATH_CONST_SQRT3', f);
    assertCondition(p.features.variables.join(',') === 'y', 'Expected variable y', f);
  });

  checkPassportCase('CR-08', 'constant_registry', 'i^2 = -1', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    const iEntry = p.constants.find((c) => c.constantId === 'MATH_CONST_I');
    assertCondition(Boolean(iEntry) && iEntry?.kind === 'IMAGINARY_UNIT', 'Expected MATH_CONST_I with IMAGINARY_UNIT kind', f);
  });

  checkPassportCase('CR-09', 'constant_registry', 'x + y', (p, f) => {
    assertCondition(p.constants.length === 0, 'Expected empty constants for x + y', f);
  });

  checkPassportCase('CR-10', 'constant_registry', 'e_1 + x', (p, f) => {
    assertCondition(p.constants.length === 0, 'e_1 must NOT become MATH_CONST_E', f);
    assertCondition(p.features.variables.includes('e_1'), 'Expected variable e_1', f);
    const pCap = generatePassport('E + x');
    assertCondition(pCap.constants.length === 0 && pCap.features.variables.includes('E'), 'Uppercase E must remain variable', f);
    const p2e = generatePassport('2e');
    assertCondition(p2e.constants.length === 0 && p2e.diagnostics.some((d) => d.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE'), '2e must not silently become constant E; emits ambiguity info', f);
  });

  checkPassportCase('CR-11', 'constant_registry', '\\pi', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_PI');
    assertCondition(c?.exactValue === 'π', 'PI exactValue must be π', f);
  });

  checkPassportCase('CR-12', 'constant_registry', 'e^x', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_E');
    assertCondition(c?.exactValue === 'e', 'E exactValue must be e', f);
  });

  checkPassportCase('CR-13', 'constant_registry', '\\phi', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_PHI');
    assertCondition(c?.exactValue === '(1 + sqrt(5)) / 2', 'PHI exactValue must be (1 + sqrt(5)) / 2', f);
  });

  checkPassportCase('CR-14', 'constant_registry', 'φ', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_PHI');
    assertCondition(c?.minimalPolynomial === 'x^2 - x - 1', 'PHI minimalPolynomial must be x^2 - x - 1', f);
  });

  checkPassportCase('CR-15', 'constant_registry', '\\sqrt{2}', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_SQRT2');
    assertCondition(c?.minimalPolynomial === 'x^2 - 2', 'SQRT2 minimalPolynomial must be x^2 - 2', f);
  });

  checkPassportCase('CR-16', 'constant_registry', '\\sqrt{3}', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_SQRT3');
    assertCondition(c?.minimalPolynomial === 'x^2 - 3', 'SQRT3 minimalPolynomial must be x^2 - 3', f);
  });

  checkPassportCase('CR-17', 'constant_registry', 'i^2 = -1', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_I');
    assertCondition(c?.numberDomain === 'COMPLEX', 'I numberDomain must be COMPLEX', f);
  });

  checkPassportCase('CR-18', 'constant_registry', '\\pi + 0 + 1', (p, f) => {
    const c = p.constants.find((x) => x.constantId === 'MATH_CONST_PI');
    assertCondition(c?.exactValue === 'π' && c?.approximation === 3.141592653589793, 'Approximation must never overwrite exactValue', f);
    assertCondition(p.constants.length === 1, '0 and 1 (NUMERIC_SPECIAL) must not mix into passport.constants', f);
    assertCondition(lookupNumericSpecial('0')?.kind === 'NUMERIC_SPECIAL' && lookupNumericSpecial('1')?.kind === 'NUMERIC_SPECIAL', '0 and 1 registered as NUMERIC_SPECIAL', f);
    assertCondition(!getConstantById('MATH_CONST_PHI')?.aliases.includes('τ'), 'τ must NOT be an alias of PHI', f);
    const pSqrt5 = generatePassport('sqrt(5)');
    assertCondition(pSqrt5.constants.length === 0 && pSqrt5.normalizedAst.kind === 'radical', 'sqrt(5) must stay radical, not PHI', f);
  });

  checkPassportCase('CR-19', 'constant_registry', 'S = πr^2', (p, f) => {
    assertCondition(p.domains[0] === 'GEOMETRY', `Expected GEOMETRY for S = πr^2, got ${p.domains[0]}`, f);
    assertCondition(p.domainClassification.classificationMethod === 'known_identity', 'Expected known_identity', f);
  });

  checkPassportCase('CR-20', 'constant_registry', 'π + x', (p, f) => {
    assertCondition(p.domains[0] === 'ALGEBRA', `π + x must NOT become GEOMETRY; got ${p.domains[0]}`, f);
  });

  checkPassportCase('CR-21', 'constant_registry', 'e^x', (p, f) => {
    assertCondition(p.domains[0] === 'ALGEBRA', `e^x must be ALGEBRA, not GEOMETRY; got ${p.domains[0]}`, f);
  });

  checkPassportCase('CR-22', 'constant_registry', 'φ^2 = φ + 1', (p, f) => {
    assertCondition(p.domains[0] === 'ALGEBRA', `φ^2 = φ + 1 must be ALGEBRA; got ${p.domains[0]}`, f);
  });

  checkPassportCase('CR-23', 'constant_registry', 'sqrt(2) + x', (p, f) => {
    assertCondition(p.domains[0] === 'ALGEBRA', `sqrt(2) + x must be ALGEBRA; got ${p.domains[0]}`, f);
  });

  checkPassportCase('CR-24', 'constant_registry', 'q + z', (p, f) => {
    assertCondition(p.constants.length === 0, 'Unknown letters q, z must not become constants', f);
    assertCondition(p.features.variables.join(',') === 'q,z', 'Expected variables q,z', f);
  });

  checkPassportCase('CR-25', 'constant_registry', '\\pi + \\varphi + sqrt(2)', (p, f) => {
    const leftAdd = p.rawAst.children[0];
    assertCondition(leftAdd?.children[0]?.raw === '\\pi', 'RAW AST must preserve \\pi', f);
    assertCondition(leftAdd?.children[1]?.raw === '\\varphi', 'RAW AST must preserve \\varphi', f);
    assertCondition(p.rawAst.children[1]?.kind === 'radical' && p.rawAst.children[1]?.raw === 'sqrt(2)', 'RAW AST must preserve radical sqrt(2)', f);
  });

  checkPassportCase('CR-26', 'constant_registry', '\\pi + \\varphi + sqrt(2)', (p, f) => {
    const leftAdd = p.normalizedAst.children[0];
    assertCondition(leftAdd?.children[0]?.kind === 'constant_ref' && leftAdd.children[0].constantId === 'MATH_CONST_PI', 'NORMALIZED AST must reference MATH_CONST_PI', f);
    assertCondition(leftAdd?.children[1]?.kind === 'constant_ref' && leftAdd.children[1].constantId === 'MATH_CONST_PHI', 'NORMALIZED AST must reference MATH_CONST_PHI', f);
    assertCondition(p.normalizedAst.children[1]?.kind === 'constant_ref' && p.normalizedAst.children[1].constantId === 'MATH_CONST_SQRT2', 'NORMALIZED AST must reference MATH_CONST_SQRT2', f);
  });

  checkPassportCase('CR-27', 'constant_registry', '\\pi + \\pi + \\pi', (p, f) => {
    const pi = p.constants.find((c) => c.constantId === 'MATH_CONST_PI');
    assertCondition(pi?.occurrences === 3, `Expected occurrences=3, got ${pi?.occurrences}`, f);
  });

  checkPassportCase('CR-28', 'constant_registry', 'a + b', (p, f) => {
    assertCondition(Array.isArray(p.constants) && p.constants.length === 0, 'Expected empty constants array', f);
  });

  checkPassportCase(
    'CR-29',
    'constant_registry',
    'i + 1',
    (p, f) => {
      assertCondition(p.constants.length === 0, 'Declared variable i must NOT become MATH_CONST_I', f);
      assertCondition(p.features.variables.includes('i'), 'Expected i in variables when declared', f);
      const pSum = generatePassport('sum(i=1..n, i)');
      assertCondition(pSum.constants.length === 0, 'Bound summation index i must NOT become MATH_CONST_I', f);
    },
    { declaredVariables: ['i'] }
  );

  checkCompareCase('CR-30', 'constant_registry', 'π', '3.141592653589793', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'numerically_supported', `Constant vs decimal approximation must NOT be proven; got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling proofMethod', f);
    const samePi = compareExpressions('π', '\\pi');
    assertCondition(samePi.mathematicalEquivalence.status === 'proven', 'Alias \\pi vs π must remain proven via canonical_ast_normalization', f);
    const diffExpr = compareExpressions('π + x', 'π + y');
    assertCondition(diffExpr.mathematicalEquivalence.status === 'refuted', 'Same constant in different formulas must be refuted', f);
  });

  // --- CONSTANT REGISTRY CONTROLLED RECOVERY TESTS (FIX A - FIX E) ---
  checkPassportCase('CR-31', 'constant_registry', '√[2]{x} + √2', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.diagnostics.length === 0, `Expected no diagnostics, got ${p.diagnostics.map((d) => d.code).join(',')}`, f);
    const leftRaw = p.rawAst.children[0];
    const rightRaw = p.rawAst.children[1];
    assertCondition(leftRaw?.kind === 'radical' && leftRaw.slots?.index !== undefined && !Array.isArray(leftRaw.slots.index) && leftRaw.slots.index.value === '2', 'RAW AST left child must be explicit radical √[2]{x}', f);
    assertCondition(rightRaw?.kind === 'radical' && !rightRaw.slots?.index, 'RAW AST right child must be implicit radical √2', f);
    const leftNorm = p.normalizedAst.children[0];
    const rightNorm = p.normalizedAst.children[1];
    assertCondition(leftNorm?.kind === 'radical' && leftNorm.metadata?.degree === 2 && leftNorm.metadata?.indexSource === 'explicit' && leftNorm.metadata?.parity === 'even', 'NORMALIZED AST left child must keep explicit degree 2 even metadata', f);
    assertCondition(rightNorm?.kind === 'constant_ref' && rightNorm.constantId === 'MATH_CONST_SQRT2' && rightNorm.metadata?.fromRadical === true, 'NORMALIZED AST right child must promote √2 to MATH_CONST_SQRT2 with fromRadical', f);
    assertCondition(p.constants.length === 1 && p.constants[0].constantId === 'MATH_CONST_SQRT2', 'Expected MATH_CONST_SQRT2 in constants', f);
    assertCondition(p.features.variables.join(',') === 'x', 'Expected variable x', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 2, `Expected RADICAL=2, got ${p.features.structuralConstructs.RADICAL}`, f);
    assertCondition(p.constraints.length === 1 && p.constraints[0].expression === 'x >= 0', 'Expected only x >= 0 constraint (no meaningless 2 >= 0)', f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
  });

  checkPassportCase('CR-32', 'constant_registry', '√[3]{x} + x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    const radNorm = p.normalizedAst.children[0];
    assertCondition(radNorm?.kind === 'radical' && radNorm.metadata?.degree === 3 && radNorm.metadata?.indexSource === 'explicit' && radNorm.metadata?.parity === 'odd', 'Expected explicit odd degree 3 metadata', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL=1', f);
    assertCondition(p.constraints.length === 0, 'Odd Unicode radical must not force x >= 0 constraint', f);
    const cmpLatex = compareExpressions('√[3]{x} + x', '\\sqrt[3]{x} + x');
    assertCondition(cmpLatex.structuralRelation.status === 'identical' && cmpLatex.mathematicalEquivalence.status === 'proven', '√[3]{x} + x must match \\sqrt[3]{x} + x in NORMALIZED AST', f);
  });

  checkPassportCase('CR-33', 'constant_registry', '√[n]{x}', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.rawAst.kind === 'radical' && p.rawAst.metadata?.indexSource === 'symbolic', 'RAW AST must mark symbolic indexSource', f);
    assertCondition(p.normalizedAst.kind === 'radical' && p.normalizedAst.metadata?.degree === null && p.normalizedAst.metadata?.parity === 'unknown', 'NORMALIZED AST must mark degree=null and parity=unknown', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL=1', f);
    assertCondition(p.constraints.some((c) => c.kind === 'domain_unknown' && c.reason === 'RADICAL_INDEX_PARITY_UNKNOWN'), 'Expected RADICAL_INDEX_PARITY_UNKNOWN constraint', f);
  });

  checkPassportCase('CR-34', 'constant_registry', '√[0]{x}', (p, f) => {
    assertCondition(p.validationErrors.includes('INVALID_RADICAL_INDEX'), 'Expected INVALID_RADICAL_INDEX for √[0]{x}', f);
    assertCondition(p.normalizedAst.metadata?.degree === 0 && p.normalizedAst.metadata?.indexSource === 'explicit', 'Expected degree=0 and explicit indexSource', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL=1', f);
  });

  checkPassportCase('CR-35', 'constant_registry', '√[-2]{x}', (p, f) => {
    assertCondition(p.validationErrors.includes('INVALID_RADICAL_INDEX'), 'Expected INVALID_RADICAL_INDEX for √[-2]{x}', f);
    assertCondition(p.normalizedAst.metadata?.degree === -2 && p.normalizedAst.metadata?.indexSource === 'explicit' && p.normalizedAst.metadata?.parity === 'unknown', 'Expected degree=-2, explicit indexSource, unknown parity', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'Expected RADICAL=1', f);
  });

  checkPassportCase('CR-36', 'constant_registry', 'sqrt(2) + x', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.rawAst.children[0]?.kind === 'radical', 'RAW AST must preserve radical node', f);
    assertCondition(p.normalizedAst.children[0]?.kind === 'constant_ref' && p.normalizedAst.children[0].constantId === 'MATH_CONST_SQRT2', 'NORMALIZED AST must promote to MATH_CONST_SQRT2', f);
    assertCondition(p.constants.length === 1 && p.constants[0].constantId === 'MATH_CONST_SQRT2', 'Expected MATH_CONST_SQRT2', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 1, 'RADICAL must be preserved in structuralConstructs', f);
    assertCondition(p.logicalOrganizations.includes('RADICAL_DEPENDENCE'), 'Expected RADICAL_DEPENDENCE in logicalOrganizations', f);
    assertCondition(p.features.maximumCompositionDepth === 1, `Expected maximumCompositionDepth=1, got ${p.features.maximumCompositionDepth}`, f);
    assertCondition(p.constraints.length === 0, 'Constant positive radicand sqrt(2) must not emit meaningless 2 >= 0 domain_dependent constraint', f);
  });

  checkPassportCase('CR-37', 'constant_registry', 'sqrt(3) + sqrt(2)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_SQRT3') && p.constants.some((c) => c.constantId === 'MATH_CONST_SQRT2'), 'Expected both SQRT3 and SQRT2', f);
    assertCondition((p.features.structuralConstructs.RADICAL ?? 0) === 2, `Expected RADICAL=2 without double counting, got ${p.features.structuralConstructs.RADICAL}`, f);
    assertCondition(p.constraints.length === 0, 'Known positive constant radicands 3 and 2 must not emit domain_dependent constraints', f);
  });

  checkPassportCase('CR-38', 'constant_registry', 'a*e', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'a*e must not promote e to MATH_CONST_E', f);
    assertCondition(p.features.variables.join(',') === 'a,e', 'Expected variables a,e', f);
    assertCondition(p.diagnostics.some((d) => d.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE'), 'a*e must emit AMBIGUOUS_CONSTANT_OR_VARIABLE consistently with x*e and 2e', f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
  });

  checkPassportCase('CR-39', 'constant_registry', 'x*e', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'x*e must not promote e to MATH_CONST_E', f);
    assertCondition(p.features.variables.join(',') === 'e,x', 'Expected variables e,x', f);
    assertCondition(p.diagnostics.some((d) => d.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE'), 'x*e must emit AMBIGUOUS_CONSTANT_OR_VARIABLE', f);
  });

  checkPassportCase('CR-40', 'constant_registry', 'ln(a*e)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'ln(a*e) must NOT automatically turn e into MATH_CONST_E', f);
    assertCondition(p.features.variables.join(',') === 'a,e', 'Expected variables a,e in ln(a*e)', f);
    assertCondition(p.diagnostics.some((d) => d.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE'), 'Expected AMBIGUOUS_CONSTANT_OR_VARIABLE for e inside ln(a*e)', f);
    const pLnDe = generatePassport('ln(d*e)');
    assertCondition(pLnDe.constants.length === 0 && pLnDe.features.variables.join(',') === 'd,e', 'ln(d*e) must behave identically to ln(a*e)', f);
    const pLnE = generatePassport('ln(e)');
    assertCondition(pLnE.constants.some((c) => c.constantId === 'MATH_CONST_E') && pLnE.features.variables.length === 0, 'Direct ln(e) must still recognize MATH_CONST_E', f);
  });

  checkCompareCase('CR-41', 'constant_registry', 'e^1', 'e', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `e^1 vs variable e must be refuted, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
  });

  checkCompareCase('CR-42', 'constant_registry', 'e^1 - e', '0', (cmp, f) => {
    assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `e^1 - e vs 0 must be refuted because trailing e is a variable, got ${cmp.mathematicalEquivalence.status}`, f);
    assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
  });

  checkCompareCase(
    'CR-43',
    'constant_registry',
    'pi',
    '3.141592653589793',
    (cmp, f) => {
      assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `Declared variable pi vs 3.141592653589793 must be refuted, got ${cmp.mathematicalEquivalence.status}`, f);
      assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
    },
    { declaredVariables: ['pi'] }
  );

  checkCompareCase(
    'CR-44',
    'constant_registry',
    'e',
    '2.718281828459045',
    (cmp, f) => {
      assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `Declared variable e vs 2.718281828459045 must be refuted, got ${cmp.mathematicalEquivalence.status}`, f);
      assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
    },
    { declaredVariables: ['e'] }
  );

  checkPassportCase('CR-45', 'constant_registry', 'sum(\\pi=1..n, \\pi)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'Bound summation index \\pi must NOT become MATH_CONST_PI', f);
    assertCondition(p.features.variables.includes('pi') && p.features.variables.includes('n'), 'Expected bound variable pi and n', f);
    assertCondition((p.features.structuralConstructs.INDEXED_SUM ?? 0) === 1, 'Expected INDEXED_SUM=1', f);
    const pPhi = generatePassport('sum(\\varphi=1..n, \\varphi)');
    assertCondition(pPhi.constants.length === 0 && pPhi.features.variables.includes('phi'), 'Bound \\varphi must NOT become MATH_CONST_PHI', f);
  });

  checkPassportCase('CR-46', 'constant_registry', 'sum(i=1..n, i^2)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'Bound index i in sum(i=1..n, i^2) must NOT become MATH_CONST_I', f);
    assertCondition(p.features.variables.join(',') === 'i,n', 'Expected variables i,n', f);
    assertCondition((p.features.structuralConstructs.INDEXED_SUM ?? 0) === 1, 'Expected INDEXED_SUM=1', f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
    assertCondition(p.diagnostics.length === 0, 'Bound index i must not emit ambiguity diagnostic', f);
  });

  checkCompareCase(
    'CR-47',
    'constant_registry',
    'i^2',
    '-1',
    (cmp, f) => {
      assertCondition(cmp.mathematicalEquivalence.status === 'refuted', `In explicit REAL context without imaginary declaration, variable i^2 vs -1 must be refuted, got ${cmp.mathematicalEquivalence.status}`, f);
      assertCondition(cmp.mathematicalEquivalence.proofMethod === 'numeric_sampling', 'Expected numeric_sampling', f);
    },
    { numberDomain: 'REAL' }
  );

  checkCompareCase(
    'CR-48',
    'constant_registry',
    'i^2',
    '-1',
    (cmp, f) => {
      assertCondition(cmp.mathematicalEquivalence.status === 'unknown', `In COMPLEX context, i^2 vs -1 must return unknown (no CAS/complex branch modeling), got ${cmp.mathematicalEquivalence.status}`, f);
      assertCondition(cmp.mathematicalEquivalence.proofMethod === 'none', 'Expected proofMethod=none', f);
      assertCondition(cmp.mathematicalEquivalence.details.toLowerCase().includes('complex'), 'Expected complex-domain explanation in details', f);
    },
    { numberDomain: 'COMPLEX' }
  );

  checkPassportCase('CR-49', 'constant_registry', 'a_i + b_i', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'Subscripted a_i + b_i must not extract MATH_CONST_I', f);
    assertCondition(p.features.variables.join(',') === 'a_i,b_i', 'Expected variables a_i,b_i', f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
    assertCondition(p.diagnostics.length === 0, 'Expected no ambiguity diagnostic for subscripted i', f);
  });

  checkPassportCase('CR-50', 'constant_registry', 'x_i + x_j', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.length === 0, 'Subscripted x_i + x_j must not extract MATH_CONST_I', f);
    assertCondition(p.features.variables.join(',') === 'x_i,x_j', 'Expected variables x_i,x_j', f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
    assertCondition(p.diagnostics.length === 0, 'Expected no ambiguity diagnostic for subscripted i/j', f);
  });

  checkPassportCase('CR-51', 'constant_registry', 'i^2 = -1', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.constants.some((c) => c.constantId === 'MATH_CONST_I'), 'Expected MATH_CONST_I for defining equation i^2 = -1', f);
    assertCondition(p.numberDomain === 'COMPLEX', `Passport containing MATH_CONST_I must reflect COMPLEX numberDomain, got ${p.numberDomain}`, f);
    assertCondition(p.diagnostics.some((d) => d.code === 'COMPLEX_DOMAIN_INFERRED'), 'Expected COMPLEX_DOMAIN_INFERRED diagnostic when context omitted', f);
    const pRealConflict = generatePassport('i^2 = -1', { numberDomain: 'REAL' });
    assertCondition(pRealConflict.numberDomain === 'COMPLEX', 'Conflicting REAL request with MATH_CONST_I must promote effective numberDomain to COMPLEX', f);
    assertCondition(pRealConflict.diagnostics.some((d) => d.code === 'NUMBER_DOMAIN_CONFLICT'), 'Expected NUMBER_DOMAIN_CONFLICT warning when REAL requested for i^2 = -1', f);
  });

  checkPassportCase(
    'CR-52',
    'constant_registry',
    'a + i',
    (p, f) => {
      assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
      assertCondition(p.constants.length === 0, 'Ambiguous "i" in REAL context a + i must NOT silently become MATH_CONST_I', f);
      assertCondition(p.features.variables.join(',') === 'a,i', 'Expected variables a,i', f);
      assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
      assertCondition(p.diagnostics.some((d) => d.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE'), 'Expected AMBIGUOUS_CONSTANT_OR_VARIABLE diagnostic', f);
    },
    { numberDomain: 'REAL' }
  );

  // --- STAGE 1: Q2 VARIABLE BINDING, LEXICAL SCOPE & SHADOWING TESTS ---
  checkPassportCase('Q2-01', 'variable_scope', 'sum(i=1..n, i)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', 'Expected parsed', f);
    assertCondition(p.features.freeVariables.join(',') === 'n', `Expected freeVariables=n, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'i,n', `Expected variables=i,n, got ${p.features.variables.join(',')}`, f);
    assertCondition(p.features.variableScopes.length === 1, 'Expected 1 variableScope entry', f);
    const s = p.features.variableScopes[0];
    assertCondition(
      s?.construct === 'INDEXED_SUM' &&
        s.boundVariable === 'i' &&
        s.scopeSlot === 'body' &&
        s.depth === 1 &&
        s.boundOccurrenceCount === 1 &&
        s.unusedBinder === false &&
        s.shadowsOuter === false,
      `Unexpected scope entry: ${JSON.stringify(s)}`,
      f
    );
  });

  checkPassportCase('Q2-02', 'variable_scope', 'sum(i=1..n, x)', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'n,x', `Expected freeVariables=n,x, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected unused binder i in boundVariables, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'i,n,x', `Expected variables=i,n,x, got ${p.features.variables.join(',')}`, f);
    const s = p.features.variableScopes[0];
    assertCondition(
      s?.boundVariable === 'i' && s.boundOccurrenceCount === 0 && s.unusedBinder === true && s.shadowsOuter === false,
      `Expected unusedBinder=true with boundOccurrenceCount=0, got ${JSON.stringify(s)}`,
      f
    );
  });

  checkPassportCase('Q2-03', 'variable_scope', 'sum(i=1..i, i)', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'i', `Expected freeVariables=i (from upperBound), got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'i', `Expected variables=i, got ${p.features.variables.join(',')}`, f);
    const s = p.features.variableScopes[0];
    assertCondition(s?.boundOccurrenceCount === 1 && s.unusedBinder === false, `Expected body occurrence counted once, got ${JSON.stringify(s)}`, f);
  });

  checkPassportCase('Q2-04', 'variable_scope', 'sum(i=1..n, a_i) + i', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'a_i,i,n', `Expected freeVariables=a_i,i,n, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'a_i,i,n', `Expected variables=a_i,i,n, got ${p.features.variables.join(',')}`, f);
  });

  checkPassportCase('Q2-05', 'variable_scope', 'sum(i=1..n, sum(j=1..m, a_ij))', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'a_ij,m,n', `Expected freeVariables=a_ij,m,n, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i,j', `Expected boundVariables=i,j, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'a_ij,i,j,m,n', `Expected variables=a_ij,i,j,m,n, got ${p.features.variables.join(',')}`, f);
    assertCondition(p.features.variableScopes.length === 2, 'Expected 2 nested scope entries', f);
    assertCondition(p.features.variableScopes[0]?.depth === 1 && p.features.variableScopes[1]?.depth === 2, 'Expected depths 1 and 2', f);
  });

  checkPassportCase('Q2-06', 'variable_scope', 'sum(i=1..n, sum(i=1..m, i))', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'm,n', `Expected freeVariables=m,n, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'i,m,n', `Expected variables=i,m,n, got ${p.features.variables.join(',')}`, f);
    const [outer, inner] = p.features.variableScopes;
    assertCondition(outer?.depth === 1 && outer.boundOccurrenceCount === 0 && outer.unusedBinder === true && outer.shadowsOuter === false, `Unexpected outer scope: ${JSON.stringify(outer)}`, f);
    assertCondition(inner?.depth === 2 && inner.boundOccurrenceCount === 1 && inner.unusedBinder === false && inner.shadowsOuter === true, `Unexpected inner shadowing scope: ${JSON.stringify(inner)}`, f);
  });

  checkPassportCase('Q2-07', 'variable_scope', 'sum(i=1..n, sum(i=1..m, i) + i)', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'm,n', `Expected freeVariables=m,n, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'i,m,n', `Expected variables=i,m,n, got ${p.features.variables.join(',')}`, f);
    assertCondition(p.features.variableScopes.length === 2, 'Expected 2 scope entries', f);
    const [outer, inner] = p.features.variableScopes;
    assertCondition(
      outer?.boundVariable === 'i' &&
        outer.depth === 1 &&
        outer.boundOccurrenceCount === 1 &&
        outer.unusedBinder === false &&
        outer.shadowsOuter === false,
      `Outer scope must restore after inner sum and record 1 occurrence: ${JSON.stringify(outer)}`,
      f
    );
    assertCondition(
      inner?.boundVariable === 'i' &&
        inner.depth === 2 &&
        inner.boundOccurrenceCount === 1 &&
        inner.unusedBinder === false &&
        inner.shadowsOuter === true,
      `Inner scope must shadow outer i and record 1 occurrence: ${JSON.stringify(inner)}`,
      f
    );
  });

  checkPassportCase('Q2-08', 'variable_scope', 'prod(k=1..n, k * x)', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'n,x', `Expected freeVariables=n,x, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'k', `Expected boundVariables=k, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'k,n,x', `Expected variables=k,n,x, got ${p.features.variables.join(',')}`, f);
    assertCondition(p.features.variableScopes[0]?.construct === 'INDEXED_PRODUCT' && p.features.variableScopes[0]?.boundOccurrenceCount === 1, 'Expected INDEXED_PRODUCT scope with 1 occurrence', f);
  });

  checkPassportCase('Q2-09', 'variable_scope', 'int(a,b,f(x),x)', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'a,b', `Expected freeVariables=a,b, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'x', `Expected boundVariables=x, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'a,b,x', `Expected variables=a,b,x, got ${p.features.variables.join(',')}`, f);
    const s = p.features.variableScopes[0];
    assertCondition(s?.construct === 'INTEGRAL' && s.scopeSlot === 'integrand' && s.boundOccurrenceCount === 1 && s.unusedBinder === false, `Unexpected integral scope: ${JSON.stringify(s)}`, f);
  });

  checkPassportCase('Q2-10', 'variable_scope', '\\int_0^1 e\\,de', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.constants.length === 0, 'Bound differential variable e must NOT promote e to MATH_CONST_E', f);
    assertCondition(p.rawAst.metadata?.definite === true, 'Expected definite=true for \\int_0^1', f);
    assertCondition(p.features.freeVariables.length === 0, `Expected no freeVariables, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'e', `Expected boundVariables=e, got ${p.features.boundVariables.join(',')}`, f);
    const pUpperFree = generatePassport('\\int_{0}^{x} t\\,dt');
    assertCondition(pUpperFree.features.freeVariables.join(',') === 'x' && pUpperFree.features.boundVariables.join(',') === 't', 'Expected x free in upperBound and t bound in integrand', f);
  });

  checkPassportCase('Q2-11', 'variable_scope', 'lim(x->a, f(x))', (p, f) => {
    assertCondition(p.features.freeVariables.join(',') === 'a', `Expected freeVariables=a, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'x', `Expected boundVariables=x, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.features.variables.join(',') === 'a,x', `Expected variables=a,x, got ${p.features.variables.join(',')}`, f);
    const s = p.features.variableScopes[0];
    assertCondition(s?.construct === 'LIMIT' && s.scopeSlot === 'body' && s.boundOccurrenceCount === 1, `Unexpected limit scope: ${JSON.stringify(s)}`, f);

    const pSameVar = generatePassport('lim(x->x, f(x))');
    assertCondition(pSameVar.features.freeVariables.join(',') === 'x' && pSameVar.features.boundVariables.join(',') === 'x', 'Expected approach x free and body x bound in lim(x->x, f(x))', f);
    assertCondition(pSameVar.features.variableScopes[0]?.boundOccurrenceCount === 1, 'Expected 1 bound occurrence of x inside body of lim(x->x, f(x))', f);
  });

  checkPassportCase('Q2-12', 'variable_scope', 'lim(i->0, i)', (p, f) => {
    assertCondition(p.parseStatus === 'parsed', `Expected parsed, got ${p.parseStatus}`, f);
    assertCondition(p.constants.length === 0, 'Bound limit variable i must NOT become MATH_CONST_I', f);
    assertCondition(p.features.freeVariables.length === 0, `Expected no freeVariables, got ${p.features.freeVariables.join(',')}`, f);
    assertCondition(p.features.boundVariables.join(',') === 'i', `Expected boundVariables=i, got ${p.features.boundVariables.join(',')}`, f);
    assertCondition(p.numberDomain === 'REAL', 'Expected REAL numberDomain', f);
    assertCondition(p.diagnostics.length === 0, `Expected no ambiguity diagnostics, got ${p.diagnostics.map((d) => d.code).join(',')}`, f);
    const pLatexLim = generatePassport('\\lim_{e \\to 1} e');
    assertCondition(pLatexLim.constants.length === 0 && pLatexLim.features.freeVariables.length === 0 && pLatexLim.features.boundVariables.join(',') === 'e', 'Bound \\lim_{e \\to 1} e must bind e without constant promotion', f);
  });

  // --- STAGE 2: Q3 NUMBER DOMAIN PROVENANCE TESTS (SCENARIOS A - F) ---
  checkPassportCase(
    'Q3-01',
    'domain_scope',
    'a + b',
    (p, f) => {
      // Scenario A: REAL + real formula
      assertCondition(p.requestedNumberDomain === 'REAL', `Expected requested=REAL, got ${p.requestedNumberDomain}`, f);
      assertCondition(p.requiredNumberDomain === 'REAL', `Expected required=REAL, got ${p.requiredNumberDomain}`, f);
      assertCondition(p.effectiveNumberDomain === 'REAL', `Expected effective=REAL, got ${p.effectiveNumberDomain}`, f);
      assertCondition(p.numberDomain === p.effectiveNumberDomain, 'numberDomain alias must match effectiveNumberDomain', f);
      assertCondition(p.diagnostics.length === 0, 'Expected no domain conflict diagnostics', f);
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase('Q3-02', 'domain_scope', 'i^2 = -1', (p, f) => {
    // Scenario B: UNSPECIFIED + complex constant
    assertCondition(p.requestedNumberDomain === 'UNSPECIFIED', `Expected requested=UNSPECIFIED, got ${p.requestedNumberDomain}`, f);
    assertCondition(p.requiredNumberDomain === 'COMPLEX', `Expected required=COMPLEX, got ${p.requiredNumberDomain}`, f);
    assertCondition(p.effectiveNumberDomain === 'COMPLEX', `Expected effective=COMPLEX, got ${p.effectiveNumberDomain}`, f);
    assertCondition(p.numberDomain === 'COMPLEX', 'numberDomain alias must match COMPLEX', f);
    assertCondition(p.diagnostics.some((d) => d.code === 'COMPLEX_DOMAIN_INFERRED'), 'Expected COMPLEX_DOMAIN_INFERRED', f);
  });

  checkPassportCase(
    'Q3-03',
    'domain_scope',
    'x + 1',
    (p, f) => {
      // Scenario C: COMPLEX + real formula, real sampling skipped
      assertCondition(p.requestedNumberDomain === 'COMPLEX', `Expected requested=COMPLEX, got ${p.requestedNumberDomain}`, f);
      assertCondition(p.requiredNumberDomain === 'REAL', `Expected required=REAL, got ${p.requiredNumberDomain}`, f);
      assertCondition(p.effectiveNumberDomain === 'COMPLEX', `Expected effective=COMPLEX, got ${p.effectiveNumberDomain}`, f);
      assertCondition(p.numberDomain === 'COMPLEX', 'numberDomain alias must match COMPLEX', f);
      assertCondition(!p.diagnostics.some((d) => d.code === 'NUMBER_DOMAIN_CONFLICT'), 'Must not emit conflict when COMPLEX requested for real formula', f);
      const cmp = compareExpressions('x + 1', '1 + x', { numberDomain: 'COMPLEX' });
      assertCondition(cmp.mathematicalEquivalence.status === 'unknown' && cmp.mathematicalEquivalence.proofMethod === 'none', `Expected real-only numeric sampling skipped in COMPLEX mode, got ${cmp.mathematicalEquivalence.status}`, f);
    },
    { numberDomain: 'COMPLEX' }
  );

  checkPassportCase(
    'Q3-04',
    'domain_scope',
    'i^2 = -1',
    (p, f) => {
      // Scenario D: REAL + complex constant -> preserve requested=REAL, promote effective=COMPLEX, conflict diagnostic, block real sampling
      assertCondition(p.requestedNumberDomain === 'REAL', `requestedNumberDomain must remain REAL, got ${p.requestedNumberDomain}`, f);
      assertCondition(p.requiredNumberDomain === 'COMPLEX', `Expected required=COMPLEX, got ${p.requiredNumberDomain}`, f);
      assertCondition(p.effectiveNumberDomain === 'COMPLEX', `Expected effective=COMPLEX, got ${p.effectiveNumberDomain}`, f);
      assertCondition(p.numberDomain === 'COMPLEX', 'numberDomain alias must remain COMPLEX for CR-51 compatibility', f);
      assertCondition(p.diagnostics.some((d) => d.code === 'NUMBER_DOMAIN_CONFLICT'), 'Expected NUMBER_DOMAIN_CONFLICT warning', f);

      const cmpBlocked = compareExpressions('i^2', '-1', { numberDomain: 'REAL', declaredConstants: ['i'] });
      assertCondition(cmpBlocked.mathematicalEquivalence.status === 'unknown' && cmpBlocked.mathematicalEquivalence.proofMethod === 'none', `Expected real sampling blocked on domain conflict, got ${cmpBlocked.mathematicalEquivalence.status}`, f);
    },
    { numberDomain: 'REAL' }
  );

  checkPassportCase(
    'Q3-05',
    'domain_scope',
    'i + 1',
    (p, f) => {
      // Scenario E: declared variable i must remain variable in REAL domain
      assertCondition(p.constants.length === 0, 'Declared variable i must NOT become MATH_CONST_I', f);
      assertCondition(p.requestedNumberDomain === 'REAL', `Expected requested=REAL, got ${p.requestedNumberDomain}`, f);
      assertCondition(p.requiredNumberDomain === 'REAL', `Expected required=REAL, got ${p.requiredNumberDomain}`, f);
      assertCondition(p.effectiveNumberDomain === 'REAL', `Expected effective=REAL, got ${p.effectiveNumberDomain}`, f);
      assertCondition(p.numberDomain === 'REAL', 'numberDomain alias must match REAL', f);
    },
    { declaredVariables: ['i'], numberDomain: 'REAL' }
  );

  checkPassportCase(
    'Q3-06',
    'domain_scope',
    'sqrt(-1)',
    (p, f) => {
      // Scenario F: sqrt(-1) in REAL preserves REAL and emits INVALID_DOMAIN
      assertCondition(p.requestedNumberDomain === 'REAL', `Expected requested=REAL, got ${p.requestedNumberDomain}`, f);
      assertCondition(p.requiredNumberDomain === 'REAL', `Expected required=REAL in current model, got ${p.requiredNumberDomain}`, f);
      assertCondition(p.effectiveNumberDomain === 'REAL', `Expected effective=REAL, got ${p.effectiveNumberDomain}`, f);
      assertCondition(p.numberDomain === 'REAL', 'numberDomain alias must match REAL', f);
      assertCondition(p.validationErrors.includes('INVALID_DOMAIN'), 'Expected INVALID_DOMAIN diagnostic for sqrt(-1) in REAL', f);
    },
    { numberDomain: 'REAL' }
  );

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
