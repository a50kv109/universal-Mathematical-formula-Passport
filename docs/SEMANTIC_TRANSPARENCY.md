# UMFP Semantic Transparency Extension (`0.1.1-semantic-ext`)

**Status:** Compatible Add-on Extension Layer (`src/umfp-semantic/`) — *does not modify `src/umfp-core/` or `FormulaPassport`.*

---

## 1. Purpose

While `src/umfp-core/` produces deterministic structural, logical, variable-scope (Q2), and number-domain provenance (Q3) metadata in `FormulaPassport`, mathematical and scientific formulas frequently compress complex meanings behind short symbols:

- In $S = p \cdot r$, the symbol $p$ conceals a composite quantity $p = \frac{a + b + c}{2}$ (semiperimeter), introducing dependencies on side lengths $a, b, c$.
- In research manuscripts, authors introduce custom parameters (e.g., `k_eff`), empirical fits, or local notations whose origin, units, and applicability conditions reside in surrounding text rather than inside the formula string itself.

The **Semantic Transparency Extension** bridges this gap without turning UMFP into a theorem prover or guessing unstated meanings.

---

## 2. Architectural Placement & Backward Compatibility

```text
Expression + ParseContext
        │
        ▼  (frozen UMFP Core 0.1.0)
  FormulaPassport  ◄─── 100% unchanged contract & hashes
        │
        ├───────────────────────────┐
        │                           │ (+ optional SemanticContext)
        ▼                           ▼
  Direct Core Consumers     Semantic Transparency Layer (src/umfp-semantic/)
                            ├── Semantic Definitions, Provenance & Epistemic Origin
                            ├── Recursive Composite Expansion + expanded_dependency Entries
                            ├── Context Consistency & Expansion Parse Diagnostics
                            ├── Mathematical Basis + Proof Evidence Separation
                            └── Explicit Missing Data & Ambiguities
```

- **Zero Core Mutation:** `src/umfp-core/*` is never modified. Calling `generateTransparentPassport(expr, parseCtx, semanticCtx).passport` returns the exact byte-identical `FormulaPassport` produced by `generatePassport(expr, parseCtx)`.
- **Core Reuse & Recursive Materialization:** Whenever a symbol includes `definingExpression` (e.g., `p = (a + b + c) / 2`), the extension invokes `generatePassport(...)` recursively to parse its RHS, compute leaf dependencies, materialize discovered intermediate and leaf dependencies as `roleInFormula: 'expanded_dependency'` in `symbolEntries`, and surface `constraints`, `validationErrors`, or non-`'parsed'` expansion statuses (with cycle detection).
- **Strict Semantic Completeness:** `transparencyStatus: 'complete'` is returned **only** if all top-level symbols **and** all discovered `expanded_dependency` variables are resolved (`undocumentedCount === 0`), no ambiguities remain (`ambiguousCount === 0`), all `definingExpression` expansions parsed cleanly without errors or cycles, and `mathematicalBasis.status === 'documented'`.
- **No Hallucination & No Silent Substitution:** Undocumented symbols are marked `undocumented` (`meaning: null`) and listed in `missingInformation`; conflicting definitions are marked `ambiguous`; unmatched `SemanticContext.symbols` keys (including unsupported LaTeX tokens such as `\kappa`) are surfaced in `diagnostics` rather than silently dropped or guessed.

---

## 3. Data Schema Overview (`TransparentFormulaPassport`)

- **`passport`**: Unmodified `FormulaPassport` from `umfp-core`.
- **`semanticTransparency`** (`extensionVersion: '0.1.1-semantic-ext'`):
  - **`symbolEntries`**: For each constant (`well_known`), bound variable (`Q2`), free variable, and discovered `expanded_dependency`:
    - `roleInFormula`: `'free_variable' | 'bound_variable' | 'constant' | 'expanded_dependency'`
    - `resolutionStatus`: `'well_known' | 'composite_derived' | 'author_defined' | 'ambiguous' | 'undocumented'`
    - `provenance`: `'standard_model' | 'derived_from_quantities' | 'author_introduced' | 'experimental_fit' | 'unspecified'`
    - `epistemicOrigin`: `'source_document' | 'reference_knowledge' | 'agent_inferred' | 'unknown'` (kept strictly separate from mathematical `provenance`; defaults to `'unknown'` when omitted in legacy `SemanticContext`).
    - `expansion`: `DefiningExpressionSummary` (RHS expression, `parseStatus`, `structuralId`, `canonicalExact`, `expandedLeafVariables`, child `constraints`, `validationErrors`, `cycleDetected`)
    - `sourceEvidence`: `{ section?, formulaRef?, tableOrPage?, excerpt? }`
  - **`expandedLeafVariables`**: Free variables after recursively expanding composite definitions.
  - **`mathematicalBasis`**:
    - `evidenceType`: `'formal_proof' | 'known_theorem_reference' | 'experimental_confirmation' | 'numeric_check' | 'theoretical_hypothesis' | 'missing'`
    - `epistemicOrigin`: `'source_document' | 'reference_knowledge' | 'agent_inferred' | 'unknown'`
    - `proofEvidence`: `{ sourceClaimsProof, independentlyVerified, machineVerified, verificationSystem, note }` — distinguishes whether the source claims a formal proof (`sourceClaimsProof: true`) from independent or machine verification (`independentlyVerified: false`, `machineVerified: false`, `verificationSystem: null`).
    - When absent in source, explicitly reports: *"Дополнительные данные о математическом обосновании отсутствуют в источнике."*
  - **`diagnostics`**: Structured warnings/infos (`UNMATCHED_CONTEXT_SYMBOL`, `UNSUPPORTED_LATEX_SYMBOL_MISMATCH`, `EXPANSION_PARSE_FAILED`, `EXPANSION_PARSE_PARTIAL`, `EXPANSION_CYCLE_DETECTED`, `AGENT_INFERRED_UNVERIFIED`).
  - **`missingInformation`** & **`ambiguities`** & **`transparencyMetrics`** (includes `expandedDependencyCount` and `transparencyStatus: 'complete' | 'partial' | 'insufficient_context'`).

---

## 4. Worked Scenarios

1. **Standard Formula (`S = \pi r^2`):** `π` resolves automatically from `ConstantRegistry` (`epistemicOrigin: 'reference_knowledge'`); `S` and `r` record domain definitions; basis records `known_theorem_reference` (`proofEvidence.sourceClaimsProof: false`).
2. **Composite Quantity (`S = p * r` with `p = (a + b + c) / 2`):** Base passport alone reports `freeVariables: ['S', 'p', 'r']` and `ALGEBRA`. The semantic transparency layer expands `p` via `umfp-core`, materializes `a, b, c` as `expanded_dependency` entries, and yields `expandedLeafVariables: ['S', 'a', 'b', 'c', 'r']`. If `a, b, c` are omitted from `SemanticContext`, `undocumentedCount` becomes `3` and `transparencyStatus` stays `'partial'`.
3. **Author Coefficient (`J = k_eff * (Q / delta_T)`):** Records `k_eff` as `author_defined` with `experimental_fit` provenance, `epistemicOrigin: 'source_document'`, units (`m^-2`), source table citation, and `evidenceType: 'experimental_confirmation'`.
4. **Unsupported LaTeX Token (`F = \kappa * (v / L_0)`):** When `SemanticContext` defines `\kappa` while `umfp-core` splits `\kappa`, the extension emits `UNSUPPORTED_LATEX_SYMBOL_MISMATCH` in `diagnostics` without guessing or substituting.

---

## 5. Limitations

- Does **not** extract definitions automatically from raw prose/PDFs; an upstream reader or AI extractor supplies `SemanticContext` from verified source text.
- Field validation on real multi-page scientific papers without a pre-authored `SemanticContext` remains open and requires empirical testing.
- Does **not** perform independent or machine-checked formal verification (`proofEvidence.independentlyVerified` and `proofEvidence.machineVerified` are always `false` in `0.1.1-semantic-ext`).
- Cycle detection guards infinite loops (`MAX_EXPANSION_DEPTH = 6`) by flagging `cycleDetected: true` and emitting `EXPANSION_CYCLE_DETECTED`.

---

## 6. Experimental Branch Audit Pack

For external auditing, reproducible counterexample testing, and structured review reporting on `experimental/semantic-transparency-v0.1.1`, see:
- [`EXPERIMENTAL_BRANCH.md`](./experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_BRANCH.md)
- [`EXPERIMENTAL_README.md`](./experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_README.md)
- [`INDEPENDENT_TESTING_PROTOCOL.md`](./experimental/semantic-transparency-v0.1.1/INDEPENDENT_TESTING_PROTOCOL.md)
- [`KNOWN_LIMITATIONS.md`](./experimental/semantic-transparency-v0.1.1/KNOWN_LIMITATIONS.md)
- [`CHANGELOG.md`](./experimental/semantic-transparency-v0.1.1/CHANGELOG.md)
- [`INDEPENDENT_REVIEW_TEMPLATE.md`](./experimental/semantic-transparency-v0.1.1/INDEPENDENT_REVIEW_TEMPLATE.md)

