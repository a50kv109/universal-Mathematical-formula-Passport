# UMFP Semantic Transparency Extension (`0.1.1-semantic-ext`) — Independent Researcher Guide

Welcome to the experimental branch **`experimental/semantic-transparency-v0.1.1`**. This document is a self-contained starting point for external AI agents (Gemini, DeepSeek, Claude, etc.) and human researchers inspecting or stress-testing the **Semantic Transparency Extension** without needing prior conversation history.

> **Important Status Notice:** This branch is an **experimental research preview** for independent auditing and counterexample discovery. It has **not** been accepted into the main UMFP specification and must **not** be treated as a finished production layer.

---

## 1. What Is UMFP?

**UMFP (Universal Mathematical Formula Passport)** is a deterministic TypeScript engine (`src/umfp-core/`) that converts a mathematical formula string (linear or LaTeX) plus an optional `ParseContext` into a reproducible **`FormulaPassport`**.

`FormulaPassport` separates three levels of deterministic analysis:
- **Level A (Structure):** `rawAst`, `normalizedAst`, 10 structural constructs (`FRACTION`, `RADICAL`, `INDEXED_SUM`, `MATRIX`, etc.), canonical forms, and structural IDs.
- **Level B (Logical Organization):** relational and compositional tags (`EQUATION_RELATION`, `RATIONAL_EXPRESSION`, `INDEXED_AGGREGATION`, etc.).
- **Level C (Domain):** strictly restricted in `0.1.x` to `ALGEBRA | GEOMETRY | UNKNOWN`.

It also tracks lexical variable scopes (**Q2**: `freeVariables`, `boundVariables`, `variableScopes`), registered constants (`ConstantRegistry`), and number-domain provenance (**Q3**: `requestedNumberDomain`, `requiredNumberDomain`, `effectiveNumberDomain`).

---

## 2. What Problem Does the Semantic Transparency Extension Solve?

A `FormulaPassport` accurately captures *syntax, structure, variable binding, and syntactic domain constraints*, **but a formula string alone often hides its mathematical meaning**. For example:

- In $S = p \cdot r$, the core sees three free variables `['S', 'p', 'r']` and classifies the equation as `ALGEBRA`. Without context, it does not know that $p = \frac{a + b + c}{2}$ (semiperimeter of a triangle), that $S$ and $r$ depend on side lengths $a, b, c$, or that the author claims a geometric decomposition proof.
- In $J = k_{\text{eff}} \cdot (Q / \Delta T)$, an author introduces an empirical coefficient `k_eff` fitted in Table 2 of a paper—something not deducible from formula syntax alone.

The **Semantic Transparency Extension (`src/umfp-semantic/`)** provides a structured wrapper layer (`TransparentFormulaPassport`) to record symbol meanings, recursive composite expansions, source citations, mathematical basis claims, epistemic origin, and explicit gaps—**without guessing missing meanings or altering `UMFP Core`**.

---

## 3. How `semanticTransparency` Differs from `FormulaPassport`

| Aspect | `FormulaPassport` (`src/umfp-core/`) | `TransparentFormulaPassport` (`src/umfp-semantic/`) |
| :--- | :--- | :--- |
| **Input** | `expression`, `ParseContext` | `expression`, `ParseContext`, optional `SemanticContext` |
| **Role** | Deterministic syntactic/structural & scope analysis | Contextual semantic transparency wrapper around `FormulaPassport` |
| **Composite variables** | Treats `p` in `S = p * r` strictly as an atomic free variable | Recursively expands `p`'s `definingExpression` via `generatePassport`, materializing `a, b, c` as `expanded_dependency` |
| **Author parameters & units** | Not modeled | Tracks `resolutionStatus`, `provenance`, `epistemicOrigin`, `units`, `conditions`, `sourceEvidence` |
| **Mathematical justification** | Only conservative equivalence in comparator (`comparePassports`) | Records `mathematicalBasis` (`evidenceType`, `epistemicOrigin`, `proofEvidence`) |
| **Core mutation** | Frozen `0.1.0` baseline | **Zero mutation:** `wrapped.passport` is byte-identical to `generatePassport(expr, parseCtx)` |

---

## 4. What Tasks It Solves vs Does Not Solve

### Tasks It Solves
1. **Symbol & Dependency Accounting:** Separates constants (`well_known` via `ConstantRegistry`), bound variables (`Q2`), free variables, and recursively discovered `expanded_dependency` variables.
2. **Composite Quantity Expansion:** Parses `definingExpression` through `umfp-core` recursively (up to depth `MAX_EXPANSION_DEPTH = 6`) with cycle detection (`cycleDetected` + `EXPANSION_CYCLE_DETECTED`).
3. **Honest Gap Detection:** Marks undocumented top-level or expanded symbols as `undocumented` (`meaning: null`), records them in `missingInformation`, and blocks `transparencyStatus: 'complete'`.
4. **Ambiguity Preservation:** Refuses to pick a single meaning when multiple interpretations exist (`resolutionStatus: 'ambiguous'`).
5. **Context & Parse Integrity Diagnostics:** Surfaces unmatched context keys (`UNMATCHED_CONTEXT_SYMBOL`), unsupported LaTeX token mismatches (`UNSUPPORTED_LATEX_SYMBOL_MISMATCH`), and partial/failed expansion parses (`EXPANSION_PARSE_PARTIAL`, `EXPANSION_PARSE_FAILED`).
6. **Epistemic & Proof Attribution Separation:** Separates `epistemicOrigin` (`source_document` vs `reference_knowledge` vs `agent_inferred` vs `unknown`) from mathematical `provenance`, and separates `sourceClaimsProof` from `independentlyVerified` / `machineVerified`.

### Tasks It Does **Not** Solve
- Does **not** read PDFs or extract `SemanticContext` from prose automatically.
- Does **not** verify mathematical proofs in Lean, Coq, Isabelle, or CAS.
- Does **not** perform dimensional/unit analysis or unit algebra.
- Does **not** replace `umfp-core` tokenization for unsupported LaTeX commands.
- See [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) for the complete list.

---

## 5. Architecture & File Map

```text
Expression + ParseContext
        │
        ▼  (frozen src/umfp-core/ — 0.1.0)
  FormulaPassport
        │
        ├──────────────────────────────┐
        │                              │ (+ optional SemanticContext)
        ▼                              ▼
  Core Consumers           src/umfp-semantic/ (0.1.1-semantic-ext)
                           ├── types.ts                  (schemas & diagnostic codes)
                           ├── semanticTransparency.ts   (buildSemanticTransparencyReport,
                           │                              generateTransparentPassport)
                           └── semantic-tests.ts         (ST-01..ST-07, ST-C01..ST-C08)
```

Primary entry points in `src/umfp-semantic/semanticTransparency.ts`:
- `generateTransparentPassport(expression, parseContext?, semanticContext?)`: runs `generatePassport` + `buildSemanticTransparencyReport` and returns `{ passport, semanticTransparency }`.
- `buildSemanticTransparencyReport(passport, semanticContext?)`: attaches semantic transparency analysis to an existing `FormulaPassport`.

---

## 6. Running the Project & Reproducing Baseline Checks

All commands match `package.json` in the repository root.

### Prerequisites
- Node.js (v20+ recommended; verified locally on Node v22)
- `npm`

### Install Dependencies
```bash
npm install
```

### Run Verification Commands
```bash
# 1. Core Golden Tests (src/umfp-core/)
npm test

# 2. Semantic Transparency Extension Tests (src/umfp-semantic/)
npm run test:semantic

# 3. TypeScript Type Check
npm run lint

# 4. Production Build (Vite + tsc)
npm run build
```

### Recorded Local Baseline Results *(Local Run — Not External Certification)*
These are the verified results of the local baseline check run in this environment prior to branch publication:
- **UMFP Core (`npm test`):** `123/123` passed (`failed=0`)
- **Semantic Extension (`npm run test:semantic`):** `15/15` passed (`failed=0`)
- **TypeScript lint (`npm run lint`):** passed (`tsc --noEmit`, 0 errors)
- **Production build (`npm run build`):** passed (`vite build && tsc --project tsconfig.json`)

*(Optional Web Research Lab: `npm run dev` or `npm run build && npm start` runs Express/Vite on `http://localhost:3000`. Note that the Research Lab UI primarily exposes `umfp-core`; the Semantic Transparency Extension is exercised programmatically via `src/umfp-semantic/`.)*

---

## 7. Reproducing Key Scenarios via CLI

You can run any ad-hoc experiment directly with `npx tsx -e` without modifying repository files.

### Scenario A — False Completeness Prevention (`S = p * r` with omitted `a, b, c`)
```bash
npx tsx -e "
import { generateTransparentPassport } from './src/umfp-semantic/semanticTransparency';
const res = generateTransparentPassport('S = p * r', { domainHint: 'GEOMETRY' }, {
  symbols: [
    { symbol: 'S', meaning: 'Triangle area', epistemicOrigin: 'source_document' },
    { symbol: 'p', meaning: 'Semiperimeter', definingExpression: 'p = (a + b + c) / 2', epistemicOrigin: 'source_document' },
    { symbol: 'r', meaning: 'Inradius', epistemicOrigin: 'source_document' }
  ],
  mathematicalBasis: { name: 'Inradius decomposition', evidenceType: 'formal_proof', epistemicOrigin: 'source_document', summary: 'Area decomposition.' }
});
console.log(JSON.stringify({
  metrics: res.semanticTransparency.transparencyMetrics,
  missing: res.semanticTransparency.missingInformation,
  proofEvidence: res.semanticTransparency.mathematicalBasis.proofEvidence
}, null, 2));
"
```
Expected observation: `transparencyStatus` is `'partial'` (not `'complete'`), `expandedDependencyCount` is `3`, `undocumentedCount` is `3`, `missingInformation` lists `symbol:a`, `symbol:b`, `symbol:c`, and `proofEvidence` shows `sourceClaimsProof: true`, `independentlyVerified: false`, `machineVerified: false`.

### Scenario B — Unsupported LaTeX Token (`F = \kappa * (v / L_0)`)
```bash
npx tsx -e "
import { generateTransparentPassport } from './src/umfp-semantic/semanticTransparency';
const res = generateTransparentPassport('F = \\\\kappa * (v / L_0)', undefined, {
  symbols: [
    { symbol: 'F', meaning: 'Force', epistemicOrigin: 'source_document' },
    { symbol: '\\\\kappa', meaning: 'Stiffness', epistemicOrigin: 'source_document' },
    { symbol: 'v', meaning: 'Velocity', epistemicOrigin: 'source_document' },
    { symbol: 'L_0', meaning: 'Reference length', epistemicOrigin: 'source_document' }
  ],
  mathematicalBasis: { name: 'Linear scaling', evidenceType: 'theoretical_hypothesis', summary: 'Hypothesis.' }
});
console.log(JSON.stringify({
  freeVars: res.passport.features.freeVariables,
  diagnostics: res.semanticTransparency.diagnostics,
  status: res.semanticTransparency.transparencyMetrics.transparencyStatus
}, null, 2));
"
```
Expected observation: `\kappa` is not in `freeVariables`; `diagnostics` emits `UNSUPPORTED_LATEX_SYMBOL_MISMATCH`; `transparencyStatus` is blocked from `'complete'` (`'partial'`).

---

## 8. How to Conduct an Independent Audit & Submit Results

1. Read [`EXPERIMENTAL_BRANCH.md`](./EXPERIMENTAL_BRANCH.md) and [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) first.
2. Run the local baseline checks (`npm test`, `npm run test:semantic`, `npm run lint`, `npm run build`).
3. Work systematically through the 12 test areas in [`INDEPENDENT_TESTING_PROTOCOL.md`](./INDEPENDENT_TESTING_PROTOCOL.md), **especially Area 12 (real scientific publications without pre-authored `SemanticContext`)** and adversarial counterexamples.
4. Verify `src/umfp-core/` has not been modified.
5. Record your findings, reproducible scripts/inputs, counterexamples, and verdict using [`INDEPENDENT_REVIEW_TEMPLATE.md`](./INDEPENDENT_REVIEW_TEMPLATE.md).
