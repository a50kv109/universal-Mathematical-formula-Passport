/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generatePassport } from '../umfp-core/passport';
import {
  DomainConstraint,
  FormulaPassport,
  ParseContext,
  PassportConstantEntry,
} from '../umfp-core/types';
import {
  BasisEvidenceKind,
  DefiningExpressionSummary,
  EpistemicOriginKind,
  MathematicalBasisReport,
  ParameterProvenanceKind,
  ProofEvidenceReport,
  SemanticContext,
  SemanticDiagnostic,
  SemanticSymbolEntry,
  SemanticSymbolInput,
  SemanticTransparencyReport,
  SymbolResolutionKind,
  TransparentFormulaPassport,
} from './types';

const MAX_EXPANSION_DEPTH = 6;

const MISSING_BASIS_MESSAGE =
  'Дополнительные данные о математическом обосновании отсутствуют в источнике.';

function extractRhsIfEquation(expr: string, lhsSymbol: string): string {
  const trimmed = expr.trim();
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) {
    return trimmed;
  }
  const lhs = trimmed.slice(0, eqIdx).trim();
  const rhs = trimmed.slice(eqIdx + 1).trim();
  if (lhs === lhsSymbol && rhs.length > 0) {
    return rhs;
  }
  return trimmed;
}

function resolveConstantEntry(c: PassportConstantEntry): SemanticSymbolEntry {
  const def =
    c.constantId === 'MATH_CONST_PI'
      ? "Ratio of a circle's circumference to its diameter (π)"
      : c.constantId === 'MATH_CONST_E'
      ? 'Base of the natural logarithm (e)'
      : c.constantId === 'MATH_CONST_PHI'
      ? 'Golden ratio: positive root of x^2 - x - 1 = 0 (φ)'
      : c.constantId === 'MATH_CONST_SQRT2'
      ? 'Positive square root of 2 (√2)'
      : c.constantId === 'MATH_CONST_SQRT3'
      ? 'Positive square root of 3 (√3)'
      : c.constantId === 'MATH_CONST_I'
      ? 'Imaginary unit satisfying i^2 = -1'
      : c.canonicalName;

  return {
    symbol: c.symbol,
    roleInFormula: 'constant',
    resolutionStatus: 'well_known',
    provenance: 'standard_model',
    epistemicOrigin: 'reference_knowledge',
    meaning: def,
    conditions: [...c.properties],
  };
}

interface ExpansionResult {
  summary: DefiningExpressionSummary;
  discoveredDependencies: string[];
  nestedSummaries: Map<string, DefiningExpressionSummary>;
}

function expandDefiningExpression(
  targetSymbol: string,
  definingExpr: string,
  symbolMap: Map<string, SemanticSymbolInput[]>,
  parseContext: ParseContext | undefined,
  visited: Set<string>,
  depth: number
): ExpansionResult {
  const rhsExpression = extractRhsIfEquation(definingExpr, targetSymbol);
  const subPassport = generatePassport(rhsExpression, parseContext);
  const directDependencies = subPassport.features.freeVariables.filter(
    (v) => v !== targetSymbol
  );

  const expandedLeafSet = new Set<string>();
  const discoveredDependencies = new Set<string>();
  const nestedSummaries = new Map<string, DefiningExpressionSummary>();
  const allConstraints: DomainConstraint[] = [...subPassport.constraints];
  const allErrors: string[] = [...subPassport.validationErrors];
  let cycleDetected = subPassport.features.freeVariables.includes(targetSymbol);

  for (const dep of directDependencies) {
    discoveredDependencies.add(dep);

    if (visited.has(dep) || depth >= MAX_EXPANSION_DEPTH) {
      cycleDetected = true;
      expandedLeafSet.add(dep);
      continue;
    }

    const depInputs = symbolMap.get(dep);
    const singleDep = depInputs && depInputs.length === 1 ? depInputs[0] : undefined;
    if (singleDep?.definingExpression) {
      const nextVisited = new Set(visited);
      nextVisited.add(dep);
      const nested = expandDefiningExpression(
        dep,
        singleDep.definingExpression,
        symbolMap,
        parseContext,
        nextVisited,
        depth + 1
      );
      nestedSummaries.set(dep, nested.summary);
      for (const [k, v] of nested.nestedSummaries.entries()) {
        nestedSummaries.set(k, v);
      }
      for (const nestedDep of nested.discoveredDependencies) {
        discoveredDependencies.add(nestedDep);
      }
      if (nested.summary.cycleDetected) {
        cycleDetected = true;
      }
      for (const leaf of nested.summary.expandedLeafVariables) {
        expandedLeafSet.add(leaf);
      }
      for (const c of nested.summary.constraints) {
        allConstraints.push(c);
      }
      for (const err of nested.summary.validationErrors) {
        allErrors.push(err);
      }
    } else {
      expandedLeafSet.add(dep);
    }
  }

  return {
    summary: {
      definingExpression: definingExpr,
      rhsExpression,
      parseStatus: subPassport.parseStatus,
      structuralId: subPassport.structuralId,
      canonicalExact: subPassport.canonicalExact,
      directDependencies,
      expandedLeafVariables: Array.from(expandedLeafSet).sort(),
      constraints: allConstraints,
      validationErrors: Array.from(new Set(allErrors)),
      cycleDetected,
    },
    discoveredDependencies: Array.from(discoveredDependencies).sort(),
    nestedSummaries,
  };
}

function buildProofEvidenceReport(evidenceType: BasisEvidenceKind): ProofEvidenceReport {
  if (evidenceType === 'formal_proof') {
    return {
      sourceClaimsProof: true,
      independentlyVerified: false,
      machineVerified: false,
      verificationSystem: null,
      note: 'Источник заявляет наличие формального доказательства; UMFP не выполняет независимую или машинную формальную верификацию.',
    };
  }

  if (evidenceType === 'known_theorem_reference') {
    return {
      sourceClaimsProof: false,
      independentlyVerified: false,
      machineVerified: false,
      verificationSystem: null,
      note: 'Приведена ссылка на известную теорему или справочный результат; формальная проверка данным расширением не проводилась.',
    };
  }

  if (evidenceType === 'experimental_confirmation') {
    return {
      sourceClaimsProof: false,
      independentlyVerified: false,
      machineVerified: false,
      verificationSystem: null,
      note: 'Основание опирается на экспериментальное подтверждение и не является математическим доказательством.',
    };
  }

  if (evidenceType === 'numeric_check') {
    return {
      sourceClaimsProof: false,
      independentlyVerified: false,
      machineVerified: false,
      verificationSystem: null,
      note: 'Основание опирается на численную проверку, а не на формальное доказательство.',
    };
  }

  if (evidenceType === 'theoretical_hypothesis') {
    return {
      sourceClaimsProof: false,
      independentlyVerified: false,
      machineVerified: false,
      verificationSystem: null,
      note: 'Указана теоретическая гипотеза без заявленного доказательства.',
    };
  }

  return {
    sourceClaimsProof: false,
    independentlyVerified: false,
    machineVerified: false,
    verificationSystem: null,
    note: MISSING_BASIS_MESSAGE,
  };
}

function buildMathematicalBasisReport(
  basisInput: SemanticContext['mathematicalBasis']
): MathematicalBasisReport {
  if (
    !basisInput ||
    basisInput.evidenceType === 'missing' ||
    (!basisInput.name && !basisInput.principle && !basisInput.summary && !basisInput.reference)
  ) {
    return {
      status: 'missing',
      evidenceType: 'missing',
      epistemicOrigin: basisInput?.epistemicOrigin ?? 'unknown',
      name: null,
      principle: null,
      summary: MISSING_BASIS_MESSAGE,
      applicability: [],
      proofEvidence: buildProofEvidenceReport('missing'),
    };
  }

  const evidenceType: BasisEvidenceKind = basisInput.evidenceType ?? 'theoretical_hypothesis';
  const summary =
    basisInput.summary?.trim() ||
    [basisInput.name, basisInput.principle].filter(Boolean).join(' — ') ||
    MISSING_BASIS_MESSAGE;

  return {
    status: 'documented',
    evidenceType,
    epistemicOrigin: basisInput.epistemicOrigin ?? 'unknown',
    name: basisInput.name ?? null,
    principle: basisInput.principle ?? null,
    summary,
    applicability: basisInput.applicability ? [...basisInput.applicability] : [],
    reference: basisInput.reference,
    sourceEvidence: basisInput.sourceEvidence,
    proofEvidence: buildProofEvidenceReport(evidenceType),
  };
}

function resolveVariableEntry(
  symbol: string,
  roleInFormula: SemanticSymbolEntry['roleInFormula'],
  symbolMap: Map<string, SemanticSymbolInput[]>,
  precomputedExpansion: DefiningExpressionSummary | undefined,
  missingInformation: Array<{ target: string; reason: string }>,
  ambiguities: Array<{ symbol: string; candidates: string[]; note: string }>,
  diagnostics: SemanticDiagnostic[]
): SemanticSymbolEntry {
  const inputs = symbolMap.get(symbol);

  if (!inputs || inputs.length === 0) {
    const depLabel =
      roleInFormula === 'expanded_dependency' ? 'раскрытой зависимости' : 'параметра';
    missingInformation.push({
      target: `symbol:${symbol}`,
      reason: `Определение и происхождение ${depLabel} "${symbol}" отсутствуют в переданном контексте.`,
    });
    return {
      symbol,
      roleInFormula,
      resolutionStatus: 'undocumented',
      provenance: 'unspecified',
      epistemicOrigin: 'unknown',
      meaning: null,
      conditions: [],
      uncertaintyNote: `Исходные материалы не содержат определения обозначения "${symbol}".`,
    };
  }

  const first = inputs[0];
  const epistemicOrigin: EpistemicOriginKind = first.epistemicOrigin ?? 'unknown';
  const candidateList =
    inputs.length > 1
      ? inputs.map((i) => i.meaning).filter((m): m is string => Boolean(m))
      : first.wellKnownCandidateMeanings ?? [];

  if (first.kind === 'ambiguous' || inputs.length > 1 || candidateList.length > 1) {
    const note = `Обозначение "${symbol}" имеет несколько конкурирующих интерпретаций и требует уточнения контекста.`;
    ambiguities.push({
      symbol,
      candidates: candidateList,
      note,
    });
    return {
      symbol,
      roleInFormula,
      resolutionStatus: 'ambiguous',
      provenance: first.provenance ?? 'unspecified',
      epistemicOrigin,
      meaning: null,
      conditions: first.conditions ? [...first.conditions] : [],
      candidates: candidateList,
      sourceEvidence: first.sourceEvidence,
      uncertaintyNote: note,
    };
  }

  if (precomputedExpansion) {
    const provenance: ParameterProvenanceKind =
      first.provenance ?? 'derived_from_quantities';
    const resolutionStatus: SymbolResolutionKind =
      first.kind ?? 'composite_derived';

    const uncertaintyNotes: string[] = [];
    if (precomputedExpansion.parseStatus !== 'parsed') {
      const code =
        precomputedExpansion.parseStatus === 'failed'
          ? 'EXPANSION_PARSE_FAILED'
          : 'EXPANSION_PARSE_PARTIAL';
      const msg = `Определение "${symbol}" ("${precomputedExpansion.definingExpression}") имеет статус разбора "${precomputedExpansion.parseStatus}".`;
      diagnostics.push({
        level: precomputedExpansion.parseStatus === 'failed' ? 'error' : 'warning',
        code,
        symbol,
        message: msg,
      });
      missingInformation.push({
        target: `expansion:${symbol}`,
        reason: msg,
      });
      uncertaintyNotes.push(msg);
    }

    if (precomputedExpansion.validationErrors.length > 0) {
      missingInformation.push({
        target: `expansion:${symbol}`,
        reason: `Раскрытие "${symbol}" содержит ошибки валидации ядра: ${precomputedExpansion.validationErrors.join(', ')}`,
      });
    }

    if (precomputedExpansion.cycleDetected) {
      const cycleMsg = `Обнаружена циклическая или слишком глубокая зависимость при раскрытии "${symbol}".`;
      diagnostics.push({
        level: 'warning',
        code: 'EXPANSION_CYCLE_DETECTED',
        symbol,
        message: cycleMsg,
      });
      uncertaintyNotes.push(cycleMsg);
    }

    if (epistemicOrigin === 'agent_inferred') {
      diagnostics.push({
        level: 'info',
        code: 'AGENT_INFERRED_UNVERIFIED',
        symbol,
        message: `Смысл обозначения "${symbol}" является предположением агента (agent_inferred), а не подтверждённой цитатой источника.`,
      });
      uncertaintyNotes.push('Определение предложено агентом (agent_inferred) и требует сверки с источником.');
    }

    return {
      symbol,
      roleInFormula,
      resolutionStatus,
      provenance,
      epistemicOrigin,
      meaning: first.meaning ?? `Composite quantity defined as ${precomputedExpansion.rhsExpression}`,
      units: first.units,
      conditions: first.conditions ? [...first.conditions] : [],
      expansion: precomputedExpansion,
      sourceEvidence: first.sourceEvidence,
      uncertaintyNote: uncertaintyNotes.length > 0 ? uncertaintyNotes.join(' ') : undefined,
    };
  }

  if (!first.meaning) {
    missingInformation.push({
      target: `symbol:${symbol}`,
      reason: `Для "${symbol}" передана запись без смыслового определения.`,
    });
    return {
      symbol,
      roleInFormula,
      resolutionStatus: 'undocumented',
      provenance: first.provenance ?? 'unspecified',
      epistemicOrigin,
      meaning: null,
      units: first.units,
      conditions: first.conditions ? [...first.conditions] : [],
      sourceEvidence: first.sourceEvidence,
      uncertaintyNote: `Для "${symbol}" не указано семантическое определение в источнике.`,
    };
  }

  const provenance: ParameterProvenanceKind =
    first.provenance ??
    (first.kind === 'author_defined' ? 'author_introduced' : 'standard_model');
  const resolutionStatus: SymbolResolutionKind =
    first.kind ??
    (provenance === 'author_introduced' || provenance === 'experimental_fit'
      ? 'author_defined'
      : 'well_known');

  let uncertaintyNote: string | undefined;
  if (epistemicOrigin === 'agent_inferred') {
    diagnostics.push({
      level: 'info',
      code: 'AGENT_INFERRED_UNVERIFIED',
      symbol,
      message: `Смысл обозначения "${symbol}" является предположением агента (agent_inferred), а не подтверждённой цитатой источника.`,
    });
    uncertaintyNote = 'Определение предложено агентом (agent_inferred) и требует сверки с источником.';
  }

  return {
    symbol,
    roleInFormula,
    resolutionStatus,
    provenance,
    epistemicOrigin,
    meaning: first.meaning,
    units: first.units,
    conditions: first.conditions ? [...first.conditions] : [],
    sourceEvidence: first.sourceEvidence,
    uncertaintyNote,
  };
}

export function buildSemanticTransparencyReport(
  passport: FormulaPassport,
  semanticContext: SemanticContext = {}
): SemanticTransparencyReport {
  const symbolMap = new Map<string, SemanticSymbolInput[]>();
  for (const item of semanticContext.symbols ?? []) {
    const key = item.symbol.trim();
    if (!key) continue;
    const list = symbolMap.get(key) ?? [];
    list.push(item);
    symbolMap.set(key, list);
  }

  const symbolEntries: SemanticSymbolEntry[] = [];
  const missingInformation: Array<{ target: string; reason: string }> = [];
  const ambiguities: Array<{ symbol: string; candidates: string[]; note: string }> = [];
  const diagnostics: SemanticDiagnostic[] = [];
  const usedSymbolKeys = new Set<string>();

  // 1. Registered mathematical constants from UMFP Core Constant Registry
  for (const c of passport.constants) {
    if (symbolMap.has(c.symbol)) {
      usedSymbolKeys.add(c.symbol);
    }
    symbolEntries.push(resolveConstantEntry(c));
  }

  // 2. Bound variables (Q2)
  for (const boundVar of passport.features.boundVariables) {
    const inputs = symbolMap.get(boundVar);
    if (inputs && inputs.length > 0) {
      usedSymbolKeys.add(boundVar);
    }
    if (inputs && inputs.length === 1 && inputs[0].meaning) {
      symbolEntries.push({
        symbol: boundVar,
        roleInFormula: 'bound_variable',
        resolutionStatus: inputs[0].kind ?? 'well_known',
        provenance: inputs[0].provenance ?? 'standard_model',
        epistemicOrigin: inputs[0].epistemicOrigin ?? 'unknown',
        meaning: inputs[0].meaning,
        units: inputs[0].units,
        conditions: inputs[0].conditions ? [...inputs[0].conditions] : [],
        sourceEvidence: inputs[0].sourceEvidence,
      });
    } else {
      symbolEntries.push({
        symbol: boundVar,
        roleInFormula: 'bound_variable',
        resolutionStatus: 'well_known',
        provenance: 'standard_model',
        epistemicOrigin: 'reference_knowledge',
        meaning: 'Lexically bound index/dummy variable within construct scope',
        conditions: [],
      });
    }
  }

  // 3. Free variables & recursive collection of expanded dependencies (ST-C01, ST-C02, ST-C04)
  const expandedLeaves = new Set<string>();
  const discoveredExpandedDeps = new Set<string>();
  const nestedExpansionMap = new Map<string, DefiningExpressionSummary>();
  const topLevelHandled = new Set<string>([
    ...passport.features.freeVariables,
    ...passport.features.boundVariables,
  ]);

  for (const freeVar of passport.features.freeVariables) {
    const inputs = symbolMap.get(freeVar);
    if (inputs && inputs.length > 0) {
      usedSymbolKeys.add(freeVar);
    }

    const first = inputs && inputs.length === 1 ? inputs[0] : undefined;
    let expansionSummary: DefiningExpressionSummary | undefined;

    if (first?.definingExpression && first.kind !== 'ambiguous' && !(first.wellKnownCandidateMeanings && first.wellKnownCandidateMeanings.length > 1)) {
      const expanded = expandDefiningExpression(
        freeVar,
        first.definingExpression,
        symbolMap,
        semanticContext.parseContext,
        new Set([freeVar]),
        1
      );
      expansionSummary = expanded.summary;

      for (const leaf of expanded.summary.expandedLeafVariables) {
        expandedLeaves.add(leaf);
      }
      for (const dep of expanded.discoveredDependencies) {
        discoveredExpandedDeps.add(dep);
      }
      for (const [depKey, depSummary] of expanded.nestedSummaries.entries()) {
        nestedExpansionMap.set(depKey, depSummary);
      }
    } else {
      expandedLeaves.add(freeVar);
    }

    symbolEntries.push(
      resolveVariableEntry(
        freeVar,
        'free_variable',
        symbolMap,
        expansionSummary,
        missingInformation,
        ambiguities,
        diagnostics
      )
    );
  }

  // Materialize all discovered intermediate and leaf dependencies into symbolEntries (ST-C01)
  for (const depVar of Array.from(discoveredExpandedDeps).sort()) {
    if (topLevelHandled.has(depVar)) {
      continue;
    }
    if (symbolMap.has(depVar)) {
      usedSymbolKeys.add(depVar);
    }
    const nestedSummary = nestedExpansionMap.get(depVar);
    symbolEntries.push(
      resolveVariableEntry(
        depVar,
        'expanded_dependency',
        symbolMap,
        nestedSummary,
        missingInformation,
        ambiguities,
        diagnostics
      )
    );
  }

  // 4. Context Consistency Check: surface unused/unmatched SemanticContext.symbols keys (ST-C03)
  for (const ctxKey of symbolMap.keys()) {
    if (usedSymbolKeys.has(ctxKey)) {
      continue;
    }
    const isLatexCommand = ctxKey.startsWith('\\');
    if (isLatexCommand && passport.sourceExpression.includes(ctxKey)) {
      const msg = `Обозначение "${ctxKey}" из SemanticContext присутствует в исходной строке, но парсер UMFP Core не выделил его как отдельный токен (неподдерживаемая LaTeX-команда/разделение). Автоматическая подмена запрещена.`;
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_LATEX_SYMBOL_MISMATCH',
        symbol: ctxKey,
        message: msg,
      });
      missingInformation.push({
        target: `symbol:${ctxKey}`,
        reason: msg,
      });
    } else {
      diagnostics.push({
        level: 'warning',
        code: 'UNMATCHED_CONTEXT_SYMBOL',
        symbol: ctxKey,
        message: `Обозначение "${ctxKey}" передано в SemanticContext.symbols, но отсутствует среди распознанных символов формулы и её раскрытых зависимостей.`,
      });
    }
  }

  // Forward AMBIGUOUS_CONSTANT_OR_VARIABLE diagnostics from umfp-core
  for (const diag of passport.diagnostics) {
    if (diag.code === 'AMBIGUOUS_CONSTANT_OR_VARIABLE') {
      const alreadyReported = ambiguities.some(
        (a) => diag.message.includes(`"${a.symbol}"`) || diag.message.includes(`'${a.symbol}'`)
      );
      if (!alreadyReported) {
        ambiguities.push({
          symbol: 'core_diagnostic',
          candidates: [],
          note: diag.message,
        });
      }
    }
  }

  const mathematicalBasis = buildMathematicalBasisReport(semanticContext.mathematicalBasis);
  if (mathematicalBasis.status === 'missing') {
    missingInformation.push({
      target: 'mathematicalBasis',
      reason: MISSING_BASIS_MESSAGE,
    });
  }

  const totalSymbols = symbolEntries.length;
  const resolvedCount = symbolEntries.filter(
    (e) =>
      e.resolutionStatus === 'well_known' ||
      e.resolutionStatus === 'composite_derived' ||
      e.resolutionStatus === 'author_defined'
  ).length;
  const compositeExpandedCount = symbolEntries.filter(
    (e) => e.resolutionStatus === 'composite_derived'
  ).length;
  const expandedDependencyCount = symbolEntries.filter(
    (e) => e.roleInFormula === 'expanded_dependency'
  ).length;
  const authorDefinedCount = symbolEntries.filter(
    (e) => e.resolutionStatus === 'author_defined'
  ).length;
  const ambiguousCount = symbolEntries.filter(
    (e) => e.resolutionStatus === 'ambiguous'
  ).length;
  const undocumentedCount = symbolEntries.filter(
    (e) => e.resolutionStatus === 'undocumented'
  ).length;

  const hasExpansionFailure = symbolEntries.some(
    (e) =>
      e.expansion &&
      (e.expansion.parseStatus !== 'parsed' ||
        e.expansion.validationErrors.length > 0 ||
        e.expansion.cycleDetected)
  );
  const hasUnsupportedLatexMismatch = diagnostics.some(
    (d) => d.code === 'UNSUPPORTED_LATEX_SYMBOL_MISMATCH'
  );
  const hasRootParseFailure = passport.parseStatus !== 'parsed';

  const transparencyStatus: SemanticTransparencyReport['transparencyMetrics']['transparencyStatus'] =
    totalSymbols > 0 &&
    undocumentedCount === 0 &&
    ambiguousCount === 0 &&
    !hasExpansionFailure &&
    !hasUnsupportedLatexMismatch &&
    !hasRootParseFailure &&
    mathematicalBasis.status === 'documented'
      ? 'complete'
      : resolvedCount > 0 || mathematicalBasis.status === 'documented'
      ? 'partial'
      : 'insufficient_context';

  return {
    extensionVersion: '0.1.1-semantic-ext',
    sourceExpression: passport.sourceExpression,
    domainLabel: semanticContext.domainLabel,
    passportStructuralId: passport.structuralId,
    passportDomains: [...passport.domains],
    symbolEntries,
    expandedLeafVariables: Array.from(expandedLeaves).sort(),
    mathematicalBasis,
    missingInformation,
    ambiguities,
    diagnostics,
    transparencyMetrics: {
      totalSymbols,
      resolvedCount,
      compositeExpandedCount,
      expandedDependencyCount,
      authorDefinedCount,
      ambiguousCount,
      undocumentedCount,
      transparencyStatus,
    },
  };
}

export function generateTransparentPassport(
  expression: string,
  parseContext?: ParseContext,
  semanticContext?: SemanticContext
): TransparentFormulaPassport {
  const passport = generatePassport(expression, parseContext);
  const mergedSemanticContext: SemanticContext = {
    ...semanticContext,
    parseContext: semanticContext?.parseContext ?? parseContext,
  };
  const semanticTransparency = buildSemanticTransparencyReport(
    passport,
    mergedSemanticContext
  );
  return {
    passport,
    semanticTransparency,
  };
}
