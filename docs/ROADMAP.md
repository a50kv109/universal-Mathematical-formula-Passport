# UMFP Roadmap (`0.1.x`)

This roadmap records the exact engineering status of the UMFP core. It intentionally avoids speculative release dates or artificial version promises (`1.0.0`).

---

## Current Status Overview

| Milestone / Stage | Scope | Status | Verification |
| :--- | :--- | :--- | :--- |
| **UMFP `0.1.x` Core Recovery** | Dual AST (`rawAst` / `normalizedAst`), 10 structural constructs, 3-level A/B/C separation, Constant Registry, conservative comparator | **Completed** | Baseline 105 Golden Tests |
| **Stage 1 — Q2: Variable Binding & Scope** | `freeVariables`, `boundVariables`, `variableScopes`, backward-compatible `variables`, lexical binding & shadowing across `INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`, updates to `equivalence.ts` & `evaluateSymmetryStatus` | **Completed & Accepted** | +12 Q2 Golden/Adversarial Tests (`117/117` passing) |
| **Stage 2 — Q3: Number Domain Provenance** | `requestedNumberDomain`, `requiredNumberDomain`, `effectiveNumberDomain` with `numberDomain` compatibility alias and real-sampling guard | **Completed & Verified** | +6 Q3 Tests (`123/123` passing, `tsc`, `lint`, `build` clean) |
| **Stage 3 — Q4: Radical Index Metadata & Traversal** | Shared `extractNumericConstant` across `parser.ts` / `ast.ts` / `passport.ts`; explicit fractional index metadata (`√[1/2]{x}` -> `indexSource: 'explicit'`, `degree: 0.5`, `parity: 'unknown'`); `√[1/0]{x}` -> `indexSource: 'explicit'`, `degree: null`, `ZERO_DENOMINATOR`, no `RADICAL_INDEX_PARITY_UNKNOWN`; skipping redundant numeric-constant `nonzero_denominator` constraints inside radical indices while preserving `1/0` and `1/a` | **Specified — NOT Yet Implemented** | Pending separate authorization |

---

## Deferred Beyond Current `0.1.x` Stabilization

Subsequent stages will be scoped and executed **only after separate review and explicit authorization**:

- Symbolic CAS equivalence & relation/equation-system solving (`0.2+`).
- Extended domain taxonomy beyond `ALGEBRA | GEOMETRY | UNKNOWN` (only if explicitly designed with formal verification rules).
- Complex-domain multi-valued branch modeling.
- Subscript structural decomposition (e.g., decomposing `a_ij` beyond atomic identifiers when index binding semantics require it).
- External AI-agent integration tooling (outside the core deterministic package).
