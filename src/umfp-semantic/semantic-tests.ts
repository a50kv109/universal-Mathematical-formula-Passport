/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generatePassport } from '../umfp-core/passport';
import { ParseContext } from '../umfp-core/types';
import { generateTransparentPassport } from './semanticTransparency';

export interface SemanticTestCaseResult {
  id: string;
  description: string;
  passed: boolean;
  details: string;
}

export interface SemanticTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: SemanticTestCaseResult[];
}

function assert(cond: boolean, message: string, failures: string[]) {
  if (!cond) failures.push(message);
}

export function runSemanticExtensionTests(): SemanticTestSuiteSummary {
  const results: SemanticTestCaseResult[] = [];

  const testCase = (
    id: string,
    description: string,
    fn: (failures: string[]) => void
  ) => {
    const failures: string[] = [];
    fn(failures);
    results.push({
      id,
      description,
      passed: failures.length === 0,
      details: failures.length === 0 ? 'OK' : failures.join('; '),
    });
  };

  // ST-01: Known formula with standard notations & constant registry integration
  testCase('ST-01', 'Known formula (S = pi * r^2) with standard notations & theorem basis', (f) => {
    const res = generateTransparentPassport('S = \\pi r^2', undefined, {
      domainLabel: 'Euclidean Plane Geometry',
      symbols: [
        { symbol: 'S', meaning: 'Area of the circle', kind: 'well_known', provenance: 'standard_model', epistemicOrigin: 'source_document' },
        { symbol: 'r', meaning: 'Radius of the circle', kind: 'well_known', provenance: 'standard_model', epistemicOrigin: 'source_document', conditions: ['r > 0'] },
      ],
      mathematicalBasis: {
        name: 'Area of a Euclidean disk',
        principle: 'Limit of inscribed regular polygons / integration',
        evidenceType: 'known_theorem_reference',
        epistemicOrigin: 'reference_knowledge',
        summary: 'Classical area formula derived via method of exhaustion.',
        applicability: ['Euclidean plane', 'r > 0'],
      },
    });

    assert(res.passport.domains[0] === 'GEOMETRY', 'Expected GEOMETRY in base passport', f);
    assert(
      res.semanticTransparency.symbolEntries.some(
        (e) =>
          e.symbol === 'π' &&
          e.roleInFormula === 'constant' &&
          e.resolutionStatus === 'well_known' &&
          e.epistemicOrigin === 'reference_knowledge'
      ),
      'Expected π resolved via Constant Registry with epistemicOrigin=reference_knowledge',
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus === 'complete',
      `Expected complete transparency, got ${res.semanticTransparency.transparencyMetrics.transparencyStatus}`,
      f
    );
    assert(
      res.semanticTransparency.mathematicalBasis.proofEvidence.sourceClaimsProof === false &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.independentlyVerified === false &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.machineVerified === false,
      'known_theorem_reference must not set sourceClaimsProof=true or verified=true',
      f
    );
  });

  // ST-02: Composite quantity expansion (S = p * r, p = (a + b + c) / 2) with all leaves documented
  testCase('ST-02', 'Composite quantity expansion (S = p * r -> p = (a + b + c)/2) with documented leaves', (f) => {
    const res = generateTransparentPassport(
      'S = p * r',
      { domainHint: 'GEOMETRY' },
      {
        domainLabel: 'Triangle Incircle Geometry',
        symbols: [
          { symbol: 'S', meaning: 'Area of triangle ABC', kind: 'well_known', provenance: 'standard_model', epistemicOrigin: 'source_document' },
          {
            symbol: 'p',
            meaning: 'Semiperimeter of triangle ABC',
            kind: 'composite_derived',
            provenance: 'derived_from_quantities',
            epistemicOrigin: 'source_document',
            definingExpression: 'p = (a + b + c) / 2',
            conditions: ['a, b, c > 0', 'triangle inequality holds'],
            sourceEvidence: { section: 'Section 3.1', formulaRef: 'Eq. (2)' },
          },
          {
            symbol: 'r',
            meaning: 'Incircle radius of triangle ABC',
            kind: 'well_known',
            provenance: 'standard_model',
            epistemicOrigin: 'source_document',
            conditions: ['r > 0'],
          },
          { symbol: 'a', meaning: 'Side BC length', provenance: 'standard_model', epistemicOrigin: 'source_document', conditions: ['a > 0'] },
          { symbol: 'b', meaning: 'Side AC length', provenance: 'standard_model', epistemicOrigin: 'source_document', conditions: ['b > 0'] },
          { symbol: 'c', meaning: 'Side AB length', provenance: 'standard_model', epistemicOrigin: 'source_document', conditions: ['c > 0'] },
        ],
        mathematicalBasis: {
          name: 'Inradius area decomposition',
          principle: 'Geometric decomposition into 3 sub-triangles with common altitude r',
          evidenceType: 'formal_proof',
          epistemicOrigin: 'source_document',
          summary: 'Connecting incenter to vertices decomposes triangle into 3 triangles of height r; additivity yields S = pr.',
          applicability: ['Non-degenerate Euclidean triangle'],
        },
      }
    );

    const pEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'p');
    assert(Boolean(pEntry?.expansion), 'Expected expansion object on symbol p', f);
    assert(pEntry?.expansion?.rhsExpression === '(a + b + c) / 2', 'Expected RHS (a + b + c) / 2', f);
    assert(
      JSON.stringify(pEntry?.expansion?.expandedLeafVariables) === JSON.stringify(['a', 'b', 'c']),
      `Expected leaf vars [a,b,c], got ${JSON.stringify(pEntry?.expansion?.expandedLeafVariables)}`,
      f
    );
    assert(
      JSON.stringify(res.semanticTransparency.expandedLeafVariables) === JSON.stringify(['S', 'a', 'b', 'c', 'r']),
      `Expected expandedLeafVariables [S,a,b,c,r], got ${JSON.stringify(res.semanticTransparency.expandedLeafVariables)}`,
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus === 'complete',
      `Expected complete transparency when all expanded leaves are documented, got ${res.semanticTransparency.transparencyMetrics.transparencyStatus}`,
      f
    );
    assert(
      res.semanticTransparency.mathematicalBasis.proofEvidence.sourceClaimsProof === true &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.independentlyVerified === false &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.machineVerified === false,
      'Expected sourceClaimsProof=true and independent/machine verification false for formal_proof',
      f
    );
  });

  // ST-03: Multi-level nested expansion + cycle protection
  testCase('ST-03', 'Nested expansion (A = p * r -> p = P / 2 -> P = a + b + c) and cycle safety', (f) => {
    const nested = generateTransparentPassport('A = p * r', undefined, {
      symbols: [
        { symbol: 'A', meaning: 'Triangle area' },
        { symbol: 'r', meaning: 'Incircle radius' },
        { symbol: 'p', meaning: 'Semiperimeter', definingExpression: 'P / 2' },
        { symbol: 'P', meaning: 'Perimeter', definingExpression: 'a + b + c' },
      ],
    });
    const pEntry = nested.semanticTransparency.symbolEntries.find((e) => e.symbol === 'p');
    assert(
      JSON.stringify(pEntry?.expansion?.expandedLeafVariables) === JSON.stringify(['a', 'b', 'c']),
      `Expected nested leaf vars [a,b,c], got ${JSON.stringify(pEntry?.expansion?.expandedLeafVariables)}`,
      f
    );

    const cyclic = generateTransparentPassport('z = x + 1', undefined, {
      symbols: [
        { symbol: 'z', meaning: 'Output' },
        { symbol: 'x', meaning: 'Cycle A', definingExpression: 'y + 1' },
        { symbol: 'y', meaning: 'Cycle B', definingExpression: 'x - 1' },
      ],
    });
    const xEntry = cyclic.semanticTransparency.symbolEntries.find((e) => e.symbol === 'x');
    assert(xEntry?.expansion?.cycleDetected === true, 'Expected cycleDetected=true for cyclic definitions', f);
    assert(
      cyclic.semanticTransparency.diagnostics.some((d) => d.code === 'EXPANSION_CYCLE_DETECTED'),
      'Expected EXPANSION_CYCLE_DETECTED diagnostic',
      f
    );
  });

  // ST-04: Author-introduced research coefficient with experimental fit provenance
  testCase('ST-04', 'Author-introduced parameter (k_eff) with experimental provenance and source evidence', (f) => {
    const res = generateTransparentPassport('J = k_eff * (Q / delta_T)', undefined, {
      domainLabel: 'Experimental Thermal Transport',
      symbols: [
        { symbol: 'J', meaning: 'Observed thermal flux', units: 'W/m^2', epistemicOrigin: 'source_document' },
        { symbol: 'Q', meaning: 'Heat transfer rate', units: 'W', epistemicOrigin: 'source_document' },
        { symbol: 'delta_T', meaning: 'Temperature gradient difference', units: 'K', conditions: ['delta_T != 0'], epistemicOrigin: 'source_document' },
        {
          symbol: 'k_eff',
          meaning: 'Effective porosity-adjusted transfer coefficient introduced by authors',
          kind: 'author_defined',
          provenance: 'experimental_fit',
          epistemicOrigin: 'source_document',
          units: 'm^-2',
          conditions: ['Calibrated over 290 K - 350 K'],
          sourceEvidence: {
            section: 'Section 4.2',
            tableOrPage: 'Table 2, p. 11',
            excerpt: 'k_eff is fitted via least squares against 40 bench runs.',
          },
        },
      ],
      mathematicalBasis: {
        name: 'Empirical effective flux scaling',
        principle: 'Proportionality fit',
        evidenceType: 'experimental_confirmation',
        epistemicOrigin: 'source_document',
        summary: 'Empirical correlation validated across 40 laboratory measurements; not derived from first principles.',
        sourceEvidence: { section: 'Section 4.3' },
      },
    });

    const kEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'k_eff');
    assert(kEntry?.resolutionStatus === 'author_defined', 'Expected author_defined status', f);
    assert(kEntry?.provenance === 'experimental_fit', 'Expected experimental_fit provenance', f);
    assert(kEntry?.units === 'm^-2', 'Expected units preserved', f);
    assert(kEntry?.sourceEvidence?.tableOrPage === 'Table 2, p. 11', 'Expected source evidence preserved', f);
    assert(
      res.semanticTransparency.mathematicalBasis.evidenceType === 'experimental_confirmation' &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.sourceClaimsProof === false &&
        res.semanticTransparency.mathematicalBasis.proofEvidence.independentlyVerified === false,
      'Experimental confirmation must NOT claim sourceClaimsProof=true',
      f
    );
  });

  // ST-05: Undocumented author parameter & missing mathematical basis (no hallucination)
  testCase('ST-05', 'Undocumented parameters and missing basis reported honestly without guessing', (f) => {
    const res = generateTransparentPassport('S = p * r');
    assert(
      res.semanticTransparency.transparencyMetrics.undocumentedCount === 3,
      `Expected 3 undocumented symbols (S, p, r), got ${res.semanticTransparency.transparencyMetrics.undocumentedCount}`,
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus === 'insufficient_context',
      'Expected insufficient_context when no semantic definitions or basis are given',
      f
    );
    assert(
      res.semanticTransparency.mathematicalBasis.status === 'missing' &&
        res.semanticTransparency.mathematicalBasis.summary.includes('отсутствуют в источнике'),
      'Expected explicit missing mathematical basis notice',
      f
    );
    assert(res.semanticTransparency.missingInformation.length === 4, 'Expected 3 symbol + 1 basis missing entries', f);
  });

  // ST-06: Ambiguous symbol handling
  testCase('ST-06', 'Ambiguous symbol preserves candidate meanings instead of choosing silently', (f) => {
    const res = generateTransparentPassport('E = k * x', undefined, {
      symbols: [
        { symbol: 'E', meaning: 'Energy or Modulus', kind: 'well_known' },
        {
          symbol: 'k',
          kind: 'ambiguous',
          wellKnownCandidateMeanings: ['Spring stiffness constant (N/m)', 'Boltzmann constant (J/K)', 'Wave number (1/m)'],
        },
        { symbol: 'x', meaning: 'Displacement' },
      ],
    });
    const kEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'k');
    assert(kEntry?.resolutionStatus === 'ambiguous', 'Expected ambiguous status for k', f);
    assert(kEntry?.meaning === null, 'Ambiguous symbol must not commit to a single meaning', f);
    assert(res.semanticTransparency.ambiguities.length === 1, 'Expected 1 recorded ambiguity', f);
  });

  // ST-07: Strict backward compatibility with frozen UMFP Core
  testCase('ST-07', 'Backward compatibility: wrapped FormulaPassport strictly identical to umfp-core', (f) => {
    const cases: Array<[string, ParseContext | undefined]> = [
      ['S = p * r', undefined],
      ['\\sum_{i=1}^{n} a_i * x', undefined],
      ['x + i', { numberDomain: 'REAL' }],
      ['a^2 + b^2 = c^2', undefined],
    ];
    for (const [expr, ctx] of cases) {
      const corePassport = generatePassport(expr, ctx);
      const wrapped = generateTransparentPassport(expr, ctx, {
        symbols: [{ symbol: 'p', definingExpression: '(a+b+c)/2' }],
        mathematicalBasis: { evidenceType: 'numeric_check', summary: 'Checked numerically' },
      });
      assert(
        JSON.stringify(wrapped.passport) === JSON.stringify(corePassport),
        `Passport mismatch on "${expr}"`,
        f
      );
      assert(
        wrapped.semanticTransparency.mathematicalBasis.proofEvidence.sourceClaimsProof === false,
        'numeric_check != formal proof',
        f
      );
    }
  });

  // ST-C01: Recursive Semantic Collection — leaf variables enter symbolEntries as expanded_dependency
  testCase('ST-C01', 'Recursive semantic collection preserves expanded_dependency entries & metadata', (f) => {
    const res = generateTransparentPassport('S = p * r', undefined, {
      symbols: [
        { symbol: 'S', meaning: 'Triangle area', units: 'm^2', epistemicOrigin: 'source_document' },
        {
          symbol: 'p',
          meaning: 'Semiperimeter',
          definingExpression: 'p = (a + b + c) / 2',
          units: 'm',
          epistemicOrigin: 'source_document',
        },
        { symbol: 'r', meaning: 'Inradius', units: 'm', epistemicOrigin: 'source_document' },
        {
          symbol: 'a',
          meaning: 'First triangle side length',
          units: 'm',
          conditions: ['a > 0'],
          provenance: 'author_introduced',
          epistemicOrigin: 'source_document',
          sourceEvidence: { section: 'Sec. 2', formulaRef: 'Def. 1' },
        },
        {
          symbol: 'b',
          meaning: 'Second triangle side length',
          units: 'm',
          conditions: ['b > 0'],
          provenance: 'standard_model',
          epistemicOrigin: 'reference_knowledge',
        },
        {
          symbol: 'c',
          meaning: 'Third triangle side length',
          units: 'm',
          conditions: ['c > 0'],
          provenance: 'standard_model',
          epistemicOrigin: 'source_document',
        },
      ],
      mathematicalBasis: {
        name: 'Inradius formula',
        evidenceType: 'known_theorem_reference',
        epistemicOrigin: 'reference_knowledge',
        summary: 'Standard Euclidean identity.',
      },
    });

    assert(
      res.semanticTransparency.transparencyMetrics.expandedDependencyCount === 3,
      `Expected 3 expanded dependencies (a,b,c), got ${res.semanticTransparency.transparencyMetrics.expandedDependencyCount}`,
      f
    );
    const aEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'a');
    assert(aEntry?.roleInFormula === 'expanded_dependency', 'Expected roleInFormula=expanded_dependency for a', f);
    assert(aEntry?.meaning === 'First triangle side length', 'Expected meaning preserved for a', f);
    assert(aEntry?.units === 'm', 'Expected units preserved for a', f);
    assert(aEntry?.conditions[0] === 'a > 0', 'Expected conditions preserved for a', f);
    assert(aEntry?.provenance === 'author_introduced', 'Expected provenance preserved for a', f);
    assert(aEntry?.epistemicOrigin === 'source_document', 'Expected epistemicOrigin preserved for a', f);
    assert(aEntry?.sourceEvidence?.formulaRef === 'Def. 1', 'Expected sourceEvidence preserved for a', f);
    assert(
      res.semanticTransparency.diagnostics.length === 0,
      `Expected 0 diagnostics when all expanded deps are documented, got ${JSON.stringify(res.semanticTransparency.diagnostics)}`,
      f
    );
  });

  // ST-C02: Semantic Completeness — undocumented leaf dependencies block transparencyStatus='complete'
  testCase('ST-C02', 'Undocumented expanded leaf dependencies block transparencyStatus=complete', (f) => {
    const res = generateTransparentPassport('S = p * r', undefined, {
      symbols: [
        { symbol: 'S', meaning: 'Triangle area', epistemicOrigin: 'source_document' },
        {
          symbol: 'p',
          meaning: 'Semiperimeter',
          definingExpression: 'p = (a + b + c) / 2',
          epistemicOrigin: 'source_document',
        },
        { symbol: 'r', meaning: 'Inradius', epistemicOrigin: 'source_document' },
        // Intentionally omit a, b, c
      ],
      mathematicalBasis: {
        name: 'Inradius decomposition',
        evidenceType: 'formal_proof',
        epistemicOrigin: 'source_document',
        summary: 'Decomposition into 3 triangles of altitude r.',
      },
    });

    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus === 'partial',
      `Must NOT return complete when a,b,c are undocumented; got ${res.semanticTransparency.transparencyMetrics.transparencyStatus}`,
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.undocumentedCount === 3,
      `Expected undocumentedCount=3 for a,b,c, got ${res.semanticTransparency.transparencyMetrics.undocumentedCount}`,
      f
    );
    for (const leaf of ['a', 'b', 'c']) {
      const entry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === leaf);
      assert(entry?.roleInFormula === 'expanded_dependency' && entry?.resolutionStatus === 'undocumented', `Expected undocumented expanded_dependency for ${leaf}`, f);
      assert(
        res.semanticTransparency.missingInformation.some((m) => m.target === `symbol:${leaf}`),
        `Expected missingInformation entry for symbol:${leaf}`,
        f
      );
    }
  });

  // ST-C03: Context Consistency — unused keys and unsupported LaTeX tokens (\kappa) produce diagnostics
  testCase('ST-C03', 'Context consistency flags unused keys and unsupported LaTeX mismatch (\\kappa)', (f) => {
    const res = generateTransparentPassport('F = \\kappa * (v / L_0)', undefined, {
      symbols: [
        { symbol: 'F', meaning: 'Restoring force', epistemicOrigin: 'source_document' },
        { symbol: '\\kappa', meaning: 'Effective stiffness coefficient', epistemicOrigin: 'source_document' },
        { symbol: 'v', meaning: 'Velocity', epistemicOrigin: 'source_document' },
        { symbol: 'L_0', meaning: 'Reference length', epistemicOrigin: 'source_document' },
        { symbol: 'unused_param', meaning: 'Extra context key not in formula', epistemicOrigin: 'source_document' },
      ],
      mathematicalBasis: {
        name: 'Linear damping-like scaling',
        evidenceType: 'theoretical_hypothesis',
        summary: 'Proposed scaling.',
      },
    });

    assert(
      res.semanticTransparency.diagnostics.some(
        (d) => d.code === 'UNSUPPORTED_LATEX_SYMBOL_MISMATCH' && d.symbol === '\\kappa'
      ),
      'Expected UNSUPPORTED_LATEX_SYMBOL_MISMATCH diagnostic for \\kappa',
      f
    );
    assert(
      res.semanticTransparency.diagnostics.some(
        (d) => d.code === 'UNMATCHED_CONTEXT_SYMBOL' && d.symbol === 'unused_param'
      ),
      'Expected UNMATCHED_CONTEXT_SYMBOL diagnostic for unused_param',
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus !== 'complete',
      'Must NOT be complete when UNSUPPORTED_LATEX_SYMBOL_MISMATCH occurs for \\kappa',
      f
    );
  });

  // ST-C04: Expansion Parse Integrity — partial/failed definingExpression is flagged & blocks complete
  testCase('ST-C04', 'Expansion parse integrity reports partial/failed definingExpression and blocks complete', (f) => {
    const partialRes = generateTransparentPassport('y = x + 1', undefined, {
      symbols: [
        { symbol: 'y', meaning: 'Target output' },
        { symbol: 'x', meaning: 'Malformed composite', definingExpression: '1 / (' },
      ],
      mathematicalBasis: {
        name: 'Direct sum',
        evidenceType: 'known_theorem_reference',
        summary: 'Simple definition.',
      },
    });

    const xEntry = partialRes.semanticTransparency.symbolEntries.find((e) => e.symbol === 'x');
    assert(xEntry?.expansion?.parseStatus === 'partial', `Expected partial parseStatus, got ${xEntry?.expansion?.parseStatus}`, f);
    assert(
      partialRes.semanticTransparency.diagnostics.some(
        (d) => d.code === 'EXPANSION_PARSE_PARTIAL' && d.symbol === 'x'
      ),
      'Expected EXPANSION_PARSE_PARTIAL diagnostic for x',
      f
    );
    assert(
      partialRes.semanticTransparency.missingInformation.some((m) => m.target === 'expansion:x'),
      'Expected missingInformation for expansion:x',
      f
    );
    assert(
      partialRes.semanticTransparency.transparencyMetrics.transparencyStatus !== 'complete',
      'Partial expansion must block transparencyStatus=complete',
      f
    );

    const failedRes = generateTransparentPassport('y = x + 1', undefined, {
      symbols: [
        { symbol: 'y', meaning: 'Target output' },
        { symbol: 'x', meaning: 'Unparseable composite', definingExpression: '???' },
      ],
      mathematicalBasis: {
        name: 'Direct sum',
        evidenceType: 'known_theorem_reference',
        summary: 'Simple definition.',
      },
    });
    const xFailed = failedRes.semanticTransparency.symbolEntries.find((e) => e.symbol === 'x');
    assert(
      xFailed?.expansion?.parseStatus === 'failed' || xFailed?.expansion?.parseStatus === 'partial',
      `Expected non-parsed status for ???, got ${xFailed?.expansion?.parseStatus}`,
      f
    );
    assert(
      failedRes.semanticTransparency.diagnostics.some(
        (d) =>
          (d.code === 'EXPANSION_PARSE_FAILED' || d.code === 'EXPANSION_PARSE_PARTIAL') &&
          d.symbol === 'x'
      ),
      'Expected expansion parse failure/partial diagnostic for x',
      f
    );
    assert(
      failedRes.semanticTransparency.transparencyMetrics.transparencyStatus !== 'complete',
      'Non-parsed expansion must block transparencyStatus=complete',
      f
    );
  });

  // ST-C05: Epistemic Origin separation from mathematical provenance
  testCase('ST-C05', 'epistemicOrigin separates source_document, reference_knowledge, and agent_inferred', (f) => {
    const res = generateTransparentPassport('y = a * x + b', undefined, {
      symbols: [
        { symbol: 'y', meaning: 'Measured response', provenance: 'experimental_fit', epistemicOrigin: 'source_document' },
        { symbol: 'a', meaning: 'Standard slope parameter', provenance: 'standard_model', epistemicOrigin: 'reference_knowledge' },
        { symbol: 'x', meaning: 'Input coordinate (guessed by LLM)', provenance: 'standard_model', epistemicOrigin: 'agent_inferred' },
        { symbol: 'b', meaning: 'Intercept', provenance: 'author_introduced', epistemicOrigin: 'source_document' },
      ],
      mathematicalBasis: {
        name: 'Linear regression model',
        evidenceType: 'experimental_confirmation',
        epistemicOrigin: 'agent_inferred',
        summary: 'Inferred linear trend.',
      },
    });

    const yEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'y');
    const aEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'a');
    const xEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'x');
    assert(yEntry?.epistemicOrigin === 'source_document' && yEntry?.provenance === 'experimental_fit', 'Expected source_document + experimental_fit on y', f);
    assert(aEntry?.epistemicOrigin === 'reference_knowledge' && aEntry?.provenance === 'standard_model', 'Expected reference_knowledge + standard_model on a', f);
    assert(xEntry?.epistemicOrigin === 'agent_inferred' && xEntry?.provenance === 'standard_model', 'Expected agent_inferred without altering mathematical provenance on x', f);
    assert(
      res.semanticTransparency.diagnostics.some((d) => d.code === 'AGENT_INFERRED_UNVERIFIED' && d.symbol === 'x'),
      'Expected AGENT_INFERRED_UNVERIFIED diagnostic for x',
      f
    );
    assert(
      res.semanticTransparency.mathematicalBasis.epistemicOrigin === 'agent_inferred',
      'Expected epistemicOrigin preserved on mathematicalBasis',
      f
    );
  });

  // ST-C06: Proof Evidence clarity — formal_proof sets sourceClaimsProof without claiming verification
  testCase('ST-C06', 'Proof evidence separates sourceClaimsProof from independent/machine verification', (f) => {
    const res = generateTransparentPassport('a^2 + b^2 = c^2', undefined, {
      symbols: [
        { symbol: 'a', meaning: 'Leg a', epistemicOrigin: 'source_document' },
        { symbol: 'b', meaning: 'Leg b', epistemicOrigin: 'source_document' },
        { symbol: 'c', meaning: 'Hypotenuse c', epistemicOrigin: 'source_document' },
      ],
      mathematicalBasis: {
        name: 'Pythagorean Theorem',
        evidenceType: 'formal_proof',
        epistemicOrigin: 'source_document',
        summary: 'Source manuscript includes Euclidean proof by dissection.',
      },
    });

    const pe = res.semanticTransparency.mathematicalBasis.proofEvidence;
    assert(pe.sourceClaimsProof === true, 'Expected sourceClaimsProof=true', f);
    assert(pe.independentlyVerified === false, 'Expected independentlyVerified=false', f);
    assert(pe.machineVerified === false, 'Expected machineVerified=false', f);
    assert(pe.verificationSystem === null, 'Expected verificationSystem=null', f);
    assert(pe.note.includes('не выполняет'), 'Expected clear non-verification note', f);
  });

  // ST-C07: Legacy SemanticContext backward compatibility (omitted epistemicOrigin -> unknown, never guessed)
  testCase('ST-C07', 'Legacy SemanticContext omitting epistemicOrigin defaults to unknown without guessing', (f) => {
    const core = generatePassport('S = p * r');
    const res = generateTransparentPassport('S = p * r', undefined, {
      symbols: [
        { symbol: 'S', meaning: 'Area', kind: 'well_known' },
        { symbol: 'p', meaning: 'Semiperimeter', definingExpression: '(a + b + c) / 2' },
        { symbol: 'r', meaning: 'Inradius' },
        { symbol: 'a', meaning: 'Side a' },
        { symbol: 'b', meaning: 'Side b' },
        { symbol: 'c', meaning: 'Side c' },
      ],
      mathematicalBasis: {
        name: 'Inradius formula',
        evidenceType: 'known_theorem_reference',
        summary: 'Legacy basis without epistemicOrigin.',
      },
    });

    assert(JSON.stringify(res.passport) === JSON.stringify(core), 'Core passport must remain byte-identical', f);
    for (const sym of ['S', 'p', 'r', 'a', 'b', 'c']) {
      const entry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === sym);
      assert(
        entry?.epistemicOrigin === 'unknown',
        `Expected legacy symbol ${sym} epistemicOrigin=unknown, got ${entry?.epistemicOrigin}`,
        f
      );
    }
    assert(
      res.semanticTransparency.mathematicalBasis.epistemicOrigin === 'unknown',
      `Expected legacy mathematicalBasis epistemicOrigin=unknown, got ${res.semanticTransparency.mathematicalBasis.epistemicOrigin}`,
      f
    );
  });

  // ST-C08: Multi-level recursive expansion materializes intermediate & leaf dependencies with metadata
  testCase('ST-C08', 'Multi-level expansion materializes intermediate P and leaves a,b,c in symbolEntries', (f) => {
    const res = generateTransparentPassport('A = p * r', undefined, {
      symbols: [
        { symbol: 'A', meaning: 'Triangle area', epistemicOrigin: 'source_document' },
        { symbol: 'r', meaning: 'Inradius', epistemicOrigin: 'source_document' },
        { symbol: 'p', meaning: 'Semiperimeter', definingExpression: 'P / 2', epistemicOrigin: 'source_document' },
        {
          symbol: 'P',
          meaning: 'Triangle perimeter',
          definingExpression: 'a + b + c',
          units: 'm',
          epistemicOrigin: 'source_document',
          sourceEvidence: { section: 'Sec. 2.1', formulaRef: 'Eq. (1a)' },
        },
        { symbol: 'a', meaning: 'Side a', units: 'm', epistemicOrigin: 'source_document' },
        { symbol: 'b', meaning: 'Side b', units: 'm', epistemicOrigin: 'source_document' },
        { symbol: 'c', meaning: 'Side c', units: 'm', epistemicOrigin: 'source_document' },
      ],
      mathematicalBasis: {
        name: 'Inradius area via perimeter',
        evidenceType: 'formal_proof',
        epistemicOrigin: 'source_document',
        summary: 'Follows from P = a+b+c and p = P/2.',
      },
    });

    const pEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === 'P');
    assert(pEntry?.roleInFormula === 'expanded_dependency', 'Expected intermediate P as expanded_dependency', f);
    assert(pEntry?.resolutionStatus === 'composite_derived', 'Expected intermediate P as composite_derived', f);
    assert(pEntry?.expansion?.rhsExpression === 'a + b + c', 'Expected P expansion RHS a + b + c', f);
    assert(pEntry?.sourceEvidence?.formulaRef === 'Eq. (1a)', 'Expected P sourceEvidence preserved', f);
    for (const leaf of ['a', 'b', 'c']) {
      const leafEntry = res.semanticTransparency.symbolEntries.find((e) => e.symbol === leaf);
      assert(
        leafEntry?.roleInFormula === 'expanded_dependency' && leafEntry?.units === 'm',
        `Expected leaf ${leaf} materialized as expanded_dependency with units=m`,
        f
      );
    }
    assert(
      JSON.stringify(res.semanticTransparency.expandedLeafVariables) === JSON.stringify(['A', 'a', 'b', 'c', 'r']),
      `Expected expandedLeafVariables [A,a,b,c,r], got ${JSON.stringify(res.semanticTransparency.expandedLeafVariables)}`,
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.expandedDependencyCount === 4,
      `Expected 4 expanded dependencies (P,a,b,c), got ${res.semanticTransparency.transparencyMetrics.expandedDependencyCount}`,
      f
    );
    assert(
      res.semanticTransparency.transparencyMetrics.transparencyStatus === 'complete',
      `Expected complete transparency, got ${res.semanticTransparency.transparencyMetrics.transparencyStatus}`,
      f
    );
  });

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
