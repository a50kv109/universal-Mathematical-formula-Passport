# UMFP `0.1.x` Architecture

This document describes the **actual implemented architecture** of `src/umfp-core/` alongside clearly marked boundaries separating implemented features from specified (unimplemented) and deferred work.

---

## 1. Repository Layout

```text
src/
├── umfp-core/
│   ├── types.ts             # Canonical TypeScript contracts (AST, Passport, Scopes, Equivalence)
│   ├── ast.ts               # AST constructors, getChildNodes, construct mapping, normalizeAst
│   ├── constantRegistry.ts  # Registered constants (π, e, φ, √2, √3, i) & numeric specials (0, 1)
│   ├── parser.ts            # Deterministic recursive-descent & LaTeX parser -> RAW AST
│   ├── passport.ts          # Passport generator (Levels A/B/C, scopes, domains, constraints)
│   ├── equivalence.ts       # Structural, logical, and conservative mathematical comparator
│   └── golden-tests.ts      # 123 deterministic regression, recovery, Q2, and Q3 tests
├── data/umfpCatalog.ts      # UI preset formulas for the Research Lab interface
├── components/AstTreeView.tsx
└── App.tsx                  # Interactive UMFP Lab UI
server.ts                    # Express + Vite dev server + optional unverified Gemini endpoints
```

---

## 2. Three-Level Separation (A / B / C)

UMFP strictly separates three analytical layers inside `passport.ts` and `equivalence.ts`:

### Level A — Structural Notation & Composition
- **Parser (`src/umfp-core/parser.ts`):** Parses linear notation (`a/b`, `(a+b)/(c-d)`, `sqrt(x)`, `√[n]{x}`, `sum(i=1..n, ...)`, `prod(...)`, `int(...)`, `lim(...)`, `[[a,b],[c,d]]`, `det(A)`, `{eq1, eq2}`) and LaTeX (`\frac`, `\sqrt`, `\left|...\right|`, `\begin{pmatrix|bmatrix|vmatrix|cases}`, `\sum`, `\prod`, `\int`, `\lim`, `\det`).
- **Ten Structural Constructs (`StructuralConstructKind`):**
  `FRACTION`, `RADICAL`, `ABSOLUTE_VALUE`, `MATRIX`, `DETERMINANT`, `INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`, `EQUATION_SYSTEM`.
  - Note: Atomic inline division `a/b` is represented as `binary('/')`, **not** `FRACTION`, whereas `\frac{a}{b}` and grouped `(a+b)/(c-d)` are `FRACTION`.
- **Canonical Serialization & Structural IDs (`serializeAstCanonical`):**
  - `canonicalExact` serializes the full `NORMALIZED AST` preserving variable names.
  - `canonicalSchema` applies alpha-renaming (`v0`, `v1`, ...) across variable nodes to capture structural isomorphism.
  - `structuralId` (`UMFP.STR.<TAG>.<HASH6>`) and `structuralSchemaId` (`UMFP.SCH.<TAG>.<HASH6>`) use FNV-1a as short index identifiers. **Comparison always checks the full canonical string, never just the hash.**

### Level B — Logical Organization (`classifyLogicalOrganization`)
Assigns one or more `LogicalOrganizationKind` labels based on normalized structure and construct composition:
- Construct-level: `EQUATION_RELATION`, `INDEXED_AGGREGATION`, `MATRIX_TRANSFORMATION`, `DETERMINANT_STRUCTURE`, `INTEGRAL_TRANSFORMATION`, `LIMIT_PROCESS`, `RADICAL_DEPENDENCE`, `COMPOSITION` (`maximumCompositionDepth >= 2`).
- Algebraic patterns: `POWER_DEPENDENCE`, `FACTORISATION`, `EXPANSION`, `RATIONAL_EXPRESSION`, `SYMMETRY`, `INVARIANT`.
- Root scalar binary ops: `SUMMATION`, `DIFFERENCE`, `PRODUCT`, `QUOTIENT` (preserving `SUMMATION` distinct from `INDEXED_AGGREGATION`).
- Fallback: `UNKNOWN` (e.g., standalone `|a - b|` without wider relational structure).

### Level C — Mathematical Domain (`classifyDomain`)
Strictly restricted in `0.1.x` to **`ALGEBRA | GEOMETRY | UNKNOWN`**:
1. Failed parses -> `UNKNOWN`.
2. Explicit `context.domainHint` (if not `'UNKNOWN'`) -> `explicit_metadata`.
3. Recognized geometric identities (`known_identity`):
   - Euler polyhedron invariant `V - E + F = 2` -> `GEOMETRY`
   - Circle area `S = πr^2` / `A = πr^2` -> `GEOMETRY`
   - Pythagorean relation `a^2 + b^2 = c^2` -> `GEOMETRY`
4. Calculus/linear-algebra constructs (`INTEGRAL`, `LIMIT`, `MATRIX`, `DETERMINANT`) -> `UNKNOWN`.
5. General function applications (`fn:*`) without `FRACTION`/`RADICAL` -> `UNKNOWN`.
6. Scalar algebraic expressions/equations/fractions/radicals -> `ALGEBRA`.
7. Bare atoms -> `UNKNOWN`.

---

## 3. `RAW AST` vs. `NORMALIZED AST`

`normalizeAst(rawAst)` (`src/umfp-core/ast.ts`) produces a separate normalized tree **without mutating `rawAst`**:
- Unwraps redundant grouping parentheses (`kind: 'group'`).
- Normalizes implicit square roots (`\sqrt{x}`, `√x`, `sqrt(x)`) by inserting `slots.index = constant('2')` and `metadata: { degree: 2, indexSource: 'implicit_default', parity: 'even' }` in `normalizedAst`, while `rawAst` keeps `slots.index` omitted.
- Promotes `\sqrt{2}` and `\sqrt{3}` (when positive degree 2) to `constant_ref` (`MATH_CONST_SQRT2`, `MATH_CONST_SQRT3`) in `normalizedAst` with `metadata.fromRadical = true` so `RADICAL` construct counts and `RADICAL_DEPENDENCE` remain intact.
- Preserves reference sharing via memoization (`WeakMap`).

---

## 4. Constant Registry (`constantRegistry.ts`)

Registers six mathematical constants (`π`, `e`, `φ`, `√2`, `√3`, `i`) and two numeric specials (`0`, `1` with `kind: 'NUMERIC_SPECIAL'`, excluded from `passport.constants`). Disambiguation is intentionally conservative:
- `declaredVariables` and lexically bound variables (`this.boundVariables`) always override constant promotion (including `\pi`, `\phi`, `\varphi`, `e`, `i`).
- `e` promotes to `MATH_CONST_E` only in `e^...`, direct `ln(e)`/`log(e)`, or `declaredConstants`; otherwise remains a variable with `AMBIGUOUS_CONSTANT_OR_VARIABLE`.
- `i` promotes to `MATH_CONST_I` only in `COMPLEX` domain, explicit imaginary-unit identities (`i^2 = -1`, `i^2 + 1 = 0`), or `declaredConstants`. Subscripted variables like `a_i`, `x_i` are parsed as atomic variables and never promote `i`.

---

## 5. Variables and Lexical Scopes (`Q2` — Implemented)

Implemented across `types.ts`, `parser.ts`, `passport.ts`, and `equivalence.ts`:
- **Binding constructs & scope boundaries:**
  - `INDEXED_SUM` / `INDEXED_PRODUCT`: `slots.index` declares binder; scope is **only** `slots.body`. `lowerBound` and `upperBound` are evaluated in the outer scope.
  - `INTEGRAL`: `slots.variable` declares binder; scope is **only** `slots.integrand`. `lowerBound` and `upperBound` are in outer scope.
  - `LIMIT`: `slots.variable` declares binder; scope is **only** `slots.body`. `approach` is in outer scope.
- **Lexical stack & shadowing:** `visitNormalized` maintains `activeScopes: Map<string, VariableScopeEntry>`, saving and restoring any outer entry upon entering/exiting a nested scope.
- **Outputs in `StructuralFeatures`:**
  - `freeVariables`: sorted names with at least one free occurrence outside matching binder scope.
  - `boundVariables`: sorted names declared by binding constructs (even if unused in the body).
  - `variables`: backward-compatible sorted union of `freeVariables ∪ boundVariables`.
  - `variableScopes`: per-binder metadata (`construct`, `boundVariable`, `scopeSlot`, `depth`, `boundOccurrenceCount`, `unusedBinder`, `shadowsOuter`).
- **Consumers:** `equivalence.ts` (numeric sampling) and `evaluateSymmetryStatus` (`passport.ts`) operate on `freeVariables`.

---

## 6. Number Domain Provenance (`Q3` — Implemented)

Implemented in `types.ts`, `passport.ts`, and `equivalence.ts`:
- **`requestedNumberDomain`**: `context.numberDomain ?? 'UNSPECIFIED'` (never overwritten).
- **`requiredNumberDomain`**: `'COMPLEX'` if a `COMPLEX`-domain constant (`MATH_CONST_I`) is present; otherwise `'REAL'` (reflecting the recognized requirements of the `0.1.x` model, not proof of real solvability).
- **`effectiveNumberDomain`**: `'COMPLEX'` if `requestedNumberDomain === 'COMPLEX' || requiredNumberDomain === 'COMPLEX'`; otherwise `'REAL'`.
- **`numberDomain`**: backward-compatible alias of `effectiveNumberDomain`.
- **Diagnostics:**
  - `requested === 'REAL'` & `required === 'COMPLEX'` -> `warning: NUMBER_DOMAIN_CONFLICT` (`effective = 'COMPLEX'`, real numeric sampling blocked).
  - `requested === 'UNSPECIFIED'` & `required === 'COMPLEX'` -> `info: COMPLEX_DOMAIN_INFERRED`.

---

## 7. Validation, Constraints, and Mathematical Equivalence

- **Constraints (`DomainConstraint[]`):** `nonzero_denominator` (`FRACTION` & `BINARY_DIV`), `radicand_domain` (even-degree radicals in `REAL`), and `domain_unknown` (`RADICAL_INDEX_PARITY_UNKNOWN`, `INVALID_RADICAL_INDEX`, `COMPLEX_BRANCH_UNMODELED`).
- **Validation Errors (`validationErrors`):** unique error diagnostic codes (`EMPTY_INPUT`, `ZERO_DENOMINATOR`, `INVALID_DOMAIN`, `INVALID_RADICAL`, `INVALID_RADICAL_INDEX`, `UNCLOSED_ABSOLUTE`, `INVALID_FRAC`).
- **Equivalence (`comparePassports`):**
  1. `failed` parse or non-empty `validationErrors` -> `not_applicable`.
  2. Full `canonicalExact` match (with `canClaimProven`) -> `proven` (`canonical_ast_normalization`).
  3. Non-numeric constructs (`INTEGRAL`, `LIMIT`, `MATRIX`, `DETERMINANT`, `INDEXED_SUM`, `INDEXED_PRODUCT`, unmodeled functions) -> `unknown` (`none`).
  4. `effectiveNumberDomain === 'COMPLEX'` or complex constant -> `unknown` (`none`, real sampling skipped).
  5. Otherwise deterministic 6-point real sampling (`DETERMINISTIC_VALUE_TABLE`) over `freeVariables` -> `refuted` (with counterexample) or `numerically_supported` (with explicit note that it is not proof).

---

## 8. Implementation Status Boundary

| Feature / Layer | Status in Current Code |
| :--- | :--- |
| Three-level A/B/C passport & comparator | **Implemented** |
| Q2 (`freeVariables`, `boundVariables`, `variableScopes`) | **Implemented** |
| Q3 (`requested/required/effectiveNumberDomain`) | **Implemented** |
| Q4 (fractional `1/2` & undefined `1/0` radical index metadata/traversal) | **Specified only — NOT yet implemented** (see [`SPECIFICATION.md`](./SPECIFICATION.md) & [`ROADMAP.md`](./ROADMAP.md)) |
| Symbolic CAS solver, ODE/PDE, multi-domain STEM taxonomy | **Out of scope for `0.1.x`** |
| Exploratory AI audit endpoints (`server.ts`) | **Optional UI helper only** (`aiProposed: true, verificationStatus: 'unverified'`) |
