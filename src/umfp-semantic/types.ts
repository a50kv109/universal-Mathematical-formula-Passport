/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DomainConstraint,
  FormulaPassport,
  MathematicalDomain,
  ParseContext,
} from '../umfp-core/types';

export type SymbolResolutionKind =
  | 'well_known'
  | 'composite_derived'
  | 'author_defined'
  | 'ambiguous'
  | 'undocumented';

export type ParameterProvenanceKind =
  | 'standard_model'
  | 'derived_from_quantities'
  | 'author_introduced'
  | 'experimental_fit'
  | 'unspecified';

export type EpistemicOriginKind =
  | 'source_document'
  | 'reference_knowledge'
  | 'agent_inferred'
  | 'unknown';

export type BasisEvidenceKind =
  | 'formal_proof'
  | 'known_theorem_reference'
  | 'experimental_confirmation'
  | 'numeric_check'
  | 'theoretical_hypothesis'
  | 'missing';

export interface SourceEvidenceRef {
  section?: string;
  formulaRef?: string;
  tableOrPage?: string;
  excerpt?: string;
}

export interface SemanticSymbolInput {
  symbol: string;
  meaning?: string;
  kind?: SymbolResolutionKind;
  provenance?: ParameterProvenanceKind;
  epistemicOrigin?: EpistemicOriginKind;
  definingExpression?: string;
  units?: string;
  conditions?: string[];
  wellKnownCandidateMeanings?: string[];
  sourceEvidence?: SourceEvidenceRef;
}

export interface MathematicalBasisInput {
  name?: string;
  principle?: string;
  evidenceType?: BasisEvidenceKind;
  epistemicOrigin?: EpistemicOriginKind;
  summary?: string;
  applicability?: string[];
  reference?: string;
  sourceEvidence?: SourceEvidenceRef;
}

export interface SemanticContext {
  parseContext?: ParseContext;
  domainLabel?: string;
  symbols?: SemanticSymbolInput[];
  mathematicalBasis?: MathematicalBasisInput;
}

export interface DefiningExpressionSummary {
  definingExpression: string;
  rhsExpression: string;
  parseStatus: FormulaPassport['parseStatus'];
  structuralId: string;
  canonicalExact: string;
  directDependencies: string[];
  expandedLeafVariables: string[];
  constraints: DomainConstraint[];
  validationErrors: string[];
  cycleDetected: boolean;
}

export interface SemanticSymbolEntry {
  symbol: string;
  roleInFormula: 'free_variable' | 'bound_variable' | 'constant' | 'expanded_dependency';
  resolutionStatus: SymbolResolutionKind;
  provenance: ParameterProvenanceKind;
  epistemicOrigin: EpistemicOriginKind;
  meaning: string | null;
  units?: string;
  conditions: string[];
  candidates?: string[];
  expansion?: DefiningExpressionSummary;
  sourceEvidence?: SourceEvidenceRef;
  uncertaintyNote?: string;
}

export interface ProofEvidenceReport {
  sourceClaimsProof: boolean;
  independentlyVerified: boolean;
  machineVerified: boolean;
  verificationSystem: string | null;
  note: string;
}

export interface MathematicalBasisReport {
  status: 'documented' | 'missing';
  evidenceType: BasisEvidenceKind;
  epistemicOrigin: EpistemicOriginKind;
  name: string | null;
  principle: string | null;
  summary: string;
  applicability: string[];
  reference?: string;
  sourceEvidence?: SourceEvidenceRef;
  proofEvidence: ProofEvidenceReport;
}

export interface SemanticDiagnostic {
  level: 'info' | 'warning' | 'error';
  code:
    | 'UNMATCHED_CONTEXT_SYMBOL'
    | 'UNSUPPORTED_LATEX_SYMBOL_MISMATCH'
    | 'EXPANSION_PARSE_FAILED'
    | 'EXPANSION_PARSE_PARTIAL'
    | 'EXPANSION_CYCLE_DETECTED'
    | 'AGENT_INFERRED_UNVERIFIED';
  symbol?: string;
  message: string;
}

export interface SemanticTransparencyMetrics {
  totalSymbols: number;
  resolvedCount: number;
  compositeExpandedCount: number;
  expandedDependencyCount: number;
  authorDefinedCount: number;
  ambiguousCount: number;
  undocumentedCount: number;
  transparencyStatus: 'complete' | 'partial' | 'insufficient_context';
}

export interface SemanticTransparencyReport {
  extensionVersion: '0.1.1-semantic-ext';
  sourceExpression: string;
  domainLabel?: string;
  passportStructuralId: string;
  passportDomains: MathematicalDomain[];
  symbolEntries: SemanticSymbolEntry[];
  expandedLeafVariables: string[];
  mathematicalBasis: MathematicalBasisReport;
  missingInformation: Array<{ target: string; reason: string }>;
  ambiguities: Array<{ symbol: string; candidates: string[]; note: string }>;
  diagnostics: SemanticDiagnostic[];
  transparencyMetrics: SemanticTransparencyMetrics;
}

export interface TransparentFormulaPassport {
  passport: FormulaPassport;
  semanticTransparency: SemanticTransparencyReport;
}
