/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StructuralConstructKind =
  | 'FRACTION'
  | 'RADICAL'
  | 'ABSOLUTE_VALUE'
  | 'MATRIX'
  | 'DETERMINANT'
  | 'INDEXED_SUM'
  | 'INDEXED_PRODUCT'
  | 'INTEGRAL'
  | 'LIMIT'
  | 'EQUATION_SYSTEM';

export type AstNodeKind =
  | 'variable'
  | 'constant'
  | 'constant_ref'
  | 'binary'
  | 'unary'
  | 'group'
  | 'function'
  | 'relation'
  | 'fraction'
  | 'radical'
  | 'absolute'
  | 'matrix'
  | 'determinant'
  | 'indexed_sum'
  | 'indexed_product'
  | 'integral'
  | 'limit'
  | 'equation_system'
  | 'unknown';

export type AstRepresentation = 'linear' | 'stacked' | 'unknown';

export interface SourceSpan {
  start: number;
  end: number;
}

export type NumberDomain = 'REAL' | 'COMPLEX' | 'UNSPECIFIED';
export type EffectiveNumberDomain = 'REAL' | 'COMPLEX';

export type ConstantKind =
  | 'TRANSCENDENTAL'
  | 'ALGEBRAIC'
  | 'IMAGINARY_UNIT'
  | 'NUMERIC_SPECIAL';

export interface MathematicalConstant {
  constantId: string;
  canonicalName: string;
  symbol: string;
  aliases: string[];
  kind: ConstantKind;
  numberDomain: NumberDomain;
  exactValue: string | null;
  approximation: number | null;
  definition: string;
  minimalPolynomial?: string | null;
  properties: string[];
  contexts: Array<'ALGEBRA' | 'GEOMETRY'>;
  approximationPrecision?: number | null;
}

export interface PassportConstantEntry {
  constantId: string;
  symbol: string;
  canonicalName: string;
  kind: ConstantKind;
  numberDomain: NumberDomain;
  exactValue: string | null;
  approximation: number | null;
  minimalPolynomial: string | null;
  properties: string[];
  contexts: Array<'ALGEBRA' | 'GEOMETRY'>;
  occurrences: number;
}

export interface RadicalMetadata {
  degree: number | null;
  indexSource: 'explicit' | 'implicit_default' | 'symbolic';
  parity: 'even' | 'odd' | 'unknown';
}

export interface AstNode {
  kind: AstNodeKind;
  value?: string;
  operator?: string;
  constantId?: string;
  symbol?: string;
  canonicalName?: string;
  children: AstNode[];
  slots?: Record<string, AstNode | AstNode[]>;
  representation?: AstRepresentation;
  sourceSpan?: SourceSpan;
  raw?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type LogicalOrganizationKind =
  | 'SUMMATION'
  | 'DIFFERENCE'
  | 'PRODUCT'
  | 'QUOTIENT'
  | 'POWER_DEPENDENCE'
  | 'COMPOSITION'
  | 'FACTORISATION'
  | 'EXPANSION'
  | 'SYMMETRY'
  | 'INVARIANT'
  | 'RECURSIVE'
  | 'RATIONAL_EXPRESSION'
  | 'RADICAL_DEPENDENCE'
  | 'INDEXED_AGGREGATION'
  | 'MATRIX_TRANSFORMATION'
  | 'INTEGRAL_TRANSFORMATION'
  | 'LIMIT_PROCESS'
  | 'DETERMINANT_STRUCTURE'
  | 'EQUATION_RELATION'
  | 'CONSERVATION_RELATION'
  | 'UNKNOWN';

export type MathematicalDomain = 'ALGEBRA' | 'GEOMETRY' | 'UNKNOWN';
export type MathematicalDomainKind = MathematicalDomain;

export interface DomainClassification {
  primaryDomain: MathematicalDomain;
  confidence: 'high' | 'medium' | 'low';
  classificationMethod:
    | 'explicit_metadata'
    | 'known_identity'
    | 'structural_rules'
    | 'unknown';
  reasons: string[];
}

export type SymmetryStatus =
  | 'structurally_symmetric'
  | 'symbolically_proven'
  | 'numerically_supported'
  | 'unknown';

export type EquivalenceStatus =
  | 'proven'
  | 'refuted'
  | 'numerically_supported'
  | 'unknown'
  | 'not_applicable';

export type ProofMethod =
  | 'canonical_ast_normalization'
  | 'numeric_sampling'
  | 'symbolic_cas'
  | 'not_applicable'
  | 'none';

export interface DomainConstraint {
  kind: 'nonzero_denominator' | 'radicand_domain' | 'domain_unknown';
  expression: string;
  sourceConstruct: StructuralConstructKind | 'BINARY_DIV';
  status: 'required' | 'domain_dependent' | 'unknown' | 'invalid' | 'unverified';
  reason?: string;
}

export interface FractionAnalysis {
  representation: AstRepresentation;
  numeratorRaw: string;
  denominatorRaw: string;
  numeratorConstructs: StructuralConstructKind[];
  denominatorConstructs: StructuralConstructKind[];
  hasNestedOperations: boolean;
  nestingDepth: number;
  denominatorConstraint: string;
}

export interface DiagnosticMessage {
  level: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  span?: SourceSpan;
}

export interface ParseContext {
  declaredFunctions?: string[];
  declaredVariables?: string[];
  declaredConstants?: string[];
  numberDomain?: NumberDomain;
  domainHint?: MathematicalDomain;
}

export interface VariableScopeEntry {
  construct: 'INDEXED_SUM' | 'INDEXED_PRODUCT' | 'INTEGRAL' | 'LIMIT';
  boundVariable: string;
  scopeSlot: 'body' | 'integrand';
  depth: number;
  boundOccurrenceCount: number;
  unusedBinder: boolean;
  shadowsOuter: boolean;
}

export interface StructuralFeatures {
  constants: number;
  constantValues: string[];
  variables: string[];
  freeVariables: string[];
  boundVariables: string[];
  variableScopes: VariableScopeEntry[];
  operations: Record<string, number>;

  maximumDepth: number;
  parenthesisDepth: number;
  nodeCount: number;

  structuralConstructs: Partial<Record<StructuralConstructKind, number>>;

  maximumCompositionDepth: number;
  maximumFractionDepth: number | null;
}

export interface FormulaPassport {
  umfpVersion: '0.1.x';
  sourceExpression: string;
  parseStatus: 'parsed' | 'partial' | 'failed';
  /** Backward-compatible alias for effectiveNumberDomain. */
  numberDomain: NumberDomain;
  requestedNumberDomain: NumberDomain;
  requiredNumberDomain: EffectiveNumberDomain;
  effectiveNumberDomain: EffectiveNumberDomain;
  structuralId: string;
  structuralSchemaId: string;
  canonicalExact: string;
  canonicalSchema: string;
  logicalClassId: string;
  constants: PassportConstantEntry[];
  features: StructuralFeatures;
  fractionDetails: FractionAnalysis[];
  constraints: DomainConstraint[];
  validationErrors: string[];
  symmetryStatus: SymmetryStatus;
  logicalOrganizations: LogicalOrganizationKind[];
  domains: MathematicalDomain[];
  domainClassification: DomainClassification;
  rawAst: AstNode;
  normalizedAst: AstNode;
  diagnostics: DiagnosticMessage[];
}

export interface EquivalenceReport {
  structuralRelation: {
    status: 'identical' | 'schema_isomorphic' | 'structurally_different';
    structuralIdA: string;
    structuralIdB: string;
    schemaIdA: string;
    schemaIdB: string;
    constructsA: Partial<Record<StructuralConstructKind, number>>;
    constructsB: Partial<Record<StructuralConstructKind, number>>;
    representationA: AstRepresentation;
    representationB: AstRepresentation;
  };
  logicalClassRelation: {
    status: 'same_class' | 'overlapping' | 'disjoint' | 'unknown';
    logicalClassIdA: string;
    logicalClassIdB: string;
    sharedOrganizations: LogicalOrganizationKind[];
  };
  mathematicalEquivalence: {
    status: EquivalenceStatus;
    proofMethod: ProofMethod;
    details: string;
    explanation: string;
    validationErrors: string[];
    counterexample?: Record<string, number>;
    sampledPoints?: number;
  };
}
