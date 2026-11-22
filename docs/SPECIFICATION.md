# UMFP `0.1.x` Core Specification

This document consolidates the active contracts implemented in `src/umfp-core/` (`types.ts`, `parser.ts`, `ast.ts`, `constantRegistry.ts`, `passport.ts`, `equivalence.ts`). Any items marked **Specified (Stage 3 — Not Implemented)** are explicitly separated from implemented behavior.

---

## 1. Public Entry Points

- `parseExpression(expr: string, context?: ParseContext): ParseResult` (`src/umfp-core/parser.ts`)
- `normalizeAst(node: AstNode): AstNode` (`src/umfp-core/ast.ts`)
- `generatePassport(expression: string, context?: ParseContext): FormulaPassport` (`src/umfp-core/passport.ts`)
- `generatePassportFromAst(...)` (`src/umfp-core/passport.ts`)
- `comparePassports(passportA: FormulaPassport, passportB: FormulaPassport): EquivalenceReport` (`src/umfp-core/equivalence.ts`)
- `compareExpressions(exprA: string, exprB: string, context?: ParseContext): EquivalenceReport` (`src/umfp-core/equivalence.ts`)

### `ParseContext` Contract
```ts
export interface ParseContext {
  declaredFunctions?: string[];
  declaredVariables?: string[];
  declaredConstants?: string[];
  numberDomain?: NumberDomain; // 'REAL' | 'COMPLEX' | 'UNSPECIFIED'
  domainHint?: MathematicalDomain; // 'ALGEBRA' | 'GEOMETRY' | 'UNKNOWN'
}
```
- **Priority Rule (Q1):** `declaredVariables` and lexically bound variables (`boundVariables`) always prevent constant promotion for `π`, `pi`, `\pi`, `φ`, `phi`, `\phi`, `\varphi`, `e`, `i`.

---

## 2. Level A — Structural Notation & AST Contracts

### Supported `StructuralConstructKind`
`FRACTION`, `RADICAL`, `ABSOLUTE_VALUE`, `MATRIX`, `DETERMINANT`, `INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`, `EQUATION_SYSTEM`.

### `RAW AST` vs. `NORMALIZED AST`
1. `RAW AST` is never mutated by `normalizeAst`.
2. `RAW AST` preserves grouping nodes (`kind: 'group'`), explicit/implicit radical index omission, and literal/stacked notation (`representation: 'linear' | 'stacked' | 'unknown'`).
3. `NORMALIZED AST` unwraps `group` nodes, inserts explicit `index: 2` (`indexSource: 'implicit_default'`, `parity: 'even'`) on implicit square roots, and promotes `√2`/`√3` (positive degree 2) to `constant_ref` with `metadata.fromRadical = true`.
4. `canonicalExact` and `canonicalSchema` are computed strictly from `NORMALIZED AST`.

### Current Radical Index Metadata (`0.1.x` Implemented vs. Stage 3 Specified)
- **Implemented:** Explicit integer indices (`√[2]{x}`, `√[3]{x}`, `√[0]{x}`, `√[-2]{x}`) set `indexSource: 'explicit'`, `degree: 2 | 3 | 0 | -2`, and `parity: 'even' | 'odd' | 'unknown'`. Invalid indices (`0`, `-2`, `1/2`) emit `validationErrors: ['INVALID_RADICAL_INDEX']`. Symbolic indices (`√[n]{x}`) set `indexSource: 'symbolic'`, `degree: null`, `parity: 'unknown'` and emit constraint `RADICAL_INDEX_PARITY_UNKNOWN` without assuming `x >= 0`.
- **Specified (Stage 3 / Q4 — Not Yet Implemented):**
  - Unify `extractNumericConstant` across `parser.ts`, `ast.ts`, and `passport.ts` so explicit fractional indices like `√[1/2]{x}` and `\sqrt[1/2]{x}` also record `indexSource: 'explicit'`, `degree: 0.5`, `parity: 'unknown'` in `rawAst` / `normalizedAst` (instead of `symbolic` / `null`).
  - For `√[1/0]{x}`, record `indexSource: 'explicit'`, `degree: null`, preserve `ZERO_DENOMINATOR`, and omit misleading `RADICAL_INDEX_PARITY_UNKNOWN`.
  - Skip descending into numeric-constant `slots.index` when generating `nonzero_denominator` constraints so `√[1/2]{x}` and `√[2/2]{x}` do not emit noisy `2 != 0` constraints while `√[1/a]{x}` preserves `a != 0` and `√[1/0]{x}` preserves `ZERO_DENOMINATOR`.

---

## 3. Level B — Logical Organization Contract

Supported `LogicalOrganizationKind` values:
`SUMMATION`, `DIFFERENCE`, `PRODUCT`, `QUOTIENT`, `POWER_DEPENDENCE`, `COMPOSITION`, `FACTORISATION`, `EXPANSION`, `SYMMETRY`, `INVARIANT`, `RECURSIVE`, `RATIONAL_EXPRESSION`, `RADICAL_DEPENDENCE`, `INDEXED_AGGREGATION`, `MATRIX_TRANSFORMATION`, `INTEGRAL_TRANSFORMATION`, `LIMIT_PROCESS`, `DETERMINANT_STRUCTURE`, `EQUATION_RELATION`, `CONSERVATION_RELATION`, `UNKNOWN`.

- Root `+` emits `SUMMATION`, independent of `INDEXED_AGGREGATION` (`INDEXED_SUM` / `INDEXED_PRODUCT`).
- Standalone `ABSOLUTE_VALUE` (`|a - b|`) classifies to `['UNKNOWN']` with `AMBIGUOUS_BAR_CONSTRUCT` info diagnostic unless combined with recognized structural/relational features.

---

## 4. Level C — Domain Classification Contract

`MathematicalDomain = 'ALGEBRA' | 'GEOMETRY' | 'UNKNOWN'` (no other domain values allowed in `0.1.x`).

- `GEOMETRY` is assigned **only** via `domainHint: 'GEOMETRY'` or explicit `known_identity` rules (`V - E + F = 2`, `S = πr^2` / `A = πr^2`, `a^2 + b^2 = c^2`).
- `INTEGRAL`, `LIMIT`, `MATRIX`, `DETERMINANT`, unmodeled functions without rational/radical structure, bare atoms, and failed parses yield `UNKNOWN`.
- Scalar operations, fractions, radicals, and scalar equations/systems yield `ALGEBRA`.

---

## 5. Variable Binding & Scope Contract (Q2 — Implemented)

- **Binding Constructs:**
  - `INDEXED_SUM` / `INDEXED_PRODUCT`: `slots.index` declares binder; active scope is strictly `slots.body`. `lowerBound` and `upperBound` are outside the binder's scope.
  - `INTEGRAL`: `slots.variable` declares binder; active scope is strictly `slots.integrand`. `lowerBound` and `upperBound` are outside scope.
  - `LIMIT`: `slots.variable` declares binder; active scope is strictly `slots.body`. `approach` is outside scope.
- **`features.boundVariables`:** sorted set of all variable names declared by binding constructs, regardless of whether they appear inside the body.
- **`features.freeVariables`:** sorted set of variable names with at least one occurrence outside any matching binder declaration/scope.
- **`features.variables`:** backward-compatible sorted union `freeVariables ∪ boundVariables`.
- **`features.variableScopes`:** array of `VariableScopeEntry` (`construct`, `boundVariable`, `scopeSlot`, `depth`, `boundOccurrenceCount`, `unusedBinder`, `shadowsOuter`), maintained via a lexical scope stack with save/restore on shadowing.
- `equivalence.ts` and `evaluateSymmetryStatus` consume `features.freeVariables`.

---

## 6. Number Domain Provenance Contract (Q3 — Implemented)

- **`requestedNumberDomain: 'REAL' | 'COMPLEX' | 'UNSPECIFIED'`** — equals `context.numberDomain ?? 'UNSPECIFIED'`; never overwritten.
- **`requiredNumberDomain: 'REAL' | 'COMPLEX'`** — `'COMPLEX'` when a `COMPLEX`-domain constant (`MATH_CONST_I`) is present; otherwise `'REAL'` under the current `0.1.x` model.
- **`effectiveNumberDomain: 'REAL' | 'COMPLEX'`** — `'COMPLEX'` if `requestedNumberDomain === 'COMPLEX' || requiredNumberDomain === 'COMPLEX'`, else `'REAL'`.
- **`numberDomain: NumberDomain`** — backward-compatible alias equal to `effectiveNumberDomain`.
- **Conflict & Inference Diagnostics:**
  - `requestedNumberDomain === 'REAL' && requiredNumberDomain === 'COMPLEX'` -> `warning: NUMBER_DOMAIN_CONFLICT`; real sampling in `equivalence.ts` is blocked (`status: 'unknown'`).
  - `requestedNumberDomain === 'UNSPECIFIED' && requiredNumberDomain === 'COMPLEX'` -> `info: COMPLEX_DOMAIN_INFERRED`; real sampling is blocked.

---

## 7. Equivalence Contract (`EquivalenceReport`)

1. **`structuralRelation.status`**: `'identical'` (`canonicalExact` equality) | `'schema_isomorphic'` (`canonicalSchema` equality) | `'structurally_different'`.
2. **`logicalClassRelation.status`**: `'same_class'` | `'overlapping'` | `'disjoint'` | `'unknown'`.
3. **`mathematicalEquivalence.status` & `proofMethod`**:
   - `parseStatus === 'failed'` or `validationErrors.length > 0` -> `status: 'not_applicable'`.
   - `canonicalExact` match + `canClaimProven` -> `status: 'proven'`, `proofMethod: 'canonical_ast_normalization'`.
   - Relations (non-identical), higher-order/unmodeled constructs, or `effectiveNumberDomain === 'COMPLEX'` -> `status: 'unknown'` (or `'not_applicable'` for distinct relations), `proofMethod: 'none' | 'not_applicable'`.
   - Real scalar expressions -> deterministic 6-point sampling over `freeVariables` -> `status: 'refuted'` (counterexample attached) or `status: 'numerically_supported'` (`proofMethod: 'numeric_sampling'`, explicitly not algebraic proof).
