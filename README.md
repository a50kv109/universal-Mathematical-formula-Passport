# UMFP — Universal Mathematical Formula Passport (`0.1.x`)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24448675.svg)](https://doi.org/10.5281/zenodo.24448675)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

**Project status:** Experimental Research Release (`0.1.x` / Pre-release / Under Calibration)

> **UMFP — Universal Mathematical Formula Passport is an experimental system that helps AI agents identify, structurally classify, and contextualize mathematical formulas. Its Insight Bank provides a compact collection of mathematically verified and derived reference patterns that support further investigation without claiming to be a final source of mathematical truth.**
>
> **UMFP does not claim ownership of mathematical ideas. It provides a common structural language for describing mathematical formulas — freely usable by AI agents and researchers in their own work.**

[Русская версия (README.ru.md)](./README.ru.md) · [Zenodo Preprint (DOI: 10.5281/zenodo.24448675)](https://doi.org/10.5281/zenodo.24448675) · [Research Status](./docs/RESEARCH_STATUS.md) · [Project Purpose](./docs/PROJECT_PURPOSE.md) · [Architecture](./docs/ARCHITECTURE.md) · [Specification](./docs/SPECIFICATION.md) · [Roadmap](./docs/ROADMAP.md) · [Formula Catalog (24 Verified Examples)](./docs/FORMULA_CATALOG.md) · [Insight Bank](./insight-bank/README.md) · [Canonical Notation Guidance (Issue #1)](./docs/CANONICAL_NOTATION_GUIDANCE.md) · [Experimental Branch (`v0.1.1-semantic-ext`)](./docs/experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_README.md) · [License (Apache-2.0)](./LICENSE)

---

## 1. What is UMFP?

**UMFP (Universal Mathematical Formula Passport)** is a deterministic TypeScript engine and research workbench that transforms a mathematical expression (linear text or LaTeX) into a structured **Formula Passport** (`FormulaPassport`).

Rather than jumping directly to heuristic guesses or pretending to solve every formula, UMFP separates three independent levels of analysis:

- **Level A — Structural Notation & Composition:** `RAW AST`, `NORMALIZED AST`, structural constructs (`FRACTION`, `RADICAL`, `INDEXED_SUM`, `MATRIX`, etc.), canonical serialization, and structural IDs.
- **Level B — Logical Organization:** compositional and relational patterns (`EQUATION_RELATION`, `RATIONAL_EXPRESSION`, `RADICAL_DEPENDENCE`, `INDEXED_AGGREGATION`, `SYMMETRY`, etc.).
- **Level C — Supported Mathematical Domain:** strictly restricted in `0.1.x` to `ALGEBRA | GEOMETRY | UNKNOWN`.

---

## 2. What Problem Does It Solve?

When an AI agent encounters a mathematical formula inside a paper, textbook, technical specification, or user message, it often lacks reliable context. Without structural grounding, models frequently:

- conflate surface notation with mathematical equivalence (e.g., treating `a/b` and `\frac{a}{b}` inconsistently or misreading parentheses);
- guess a subject domain prematurely (e.g., assuming any formula containing $\pi$ must be geometry);
- confuse bound variables (like summation indices `i` or integration dummies `x`) with free parameters or the imaginary unit $i$;
- overlook domain constraints (denominators, even-degree radicands, number-domain conflicts) or claim proof from numeric spot checks.

UMFP solves this by producing a **deterministic, inspectable passport** that explicitly states what was recognized, what constraints apply, and **what remains `UNKNOWN`**.

---

## 3. Who Is It For?

- **Developers building AI agents and scientific pipelines** who need a deterministic pre-analysis layer before querying external references, solvers, or LLMs.
- **Mathematics & EdTech tool builders** who need separated structural, logical, and domain representations (`RAW AST` vs `NORMALIZED AST`).
- **Researchers auditing formula-handling behavior** across edge cases (binding scopes, constant disambiguation, domain provenance, and refutation vs proof boundaries).

---

## 4. Architecture: UMFP Core + Insight Bank & AI-Agent Workflow

UMFP separates deterministic formula passportization from mathematical knowledge landmarks:

```text
Formula ─▶ UMFP Core (src/umfp-core) ─▶ Formula Passport ─▶ AI Agent ◀─▶ Insight Bank (insight-bank/)
                                                                │
                                                                ▼
                                                   Further Investigation
```

- **UMFP Core (`src/umfp-core/`):** Deterministically produces `FormulaPassport` (AST, constructs, logical classes, `ALGEBRA | GEOMETRY | UNKNOWN` domain, Q2 scopes, Q3 domain provenance). Never reads `insight-bank/` and never alters its classification heuristically.
- **Insight Bank (`insight-bank/`):** A standalone Markdown **`Initial Experimental Knowledge Seed`** (currently 6 pilot entries in `PYTHAGOREAN FAMILY`) offering proven theorems, derived geometric/algebraic extensions, explicit applicability conditions, and bounded analogies. **Does not overwrite or reclassify any `FormulaPassport`.**

### Intended Integration Workflow *(Conceptual Pattern — External Search/Agents Are Not Built Into `0.1.x`)*

1. **Receive formula:** An AI agent extracts a raw formula from a document or user prompt.
2. **Request passport:** The agent calls `generatePassport(expression, context)` from `src/umfp-core/passport.ts`.
3. **Inspect Level A & Level B:** Identify structural constructs (`FRACTION`, `INTEGRAL`, `MATRIX`, etc.) and logical organizations.
4. **Inspect Level C, variables & provenance:** Check `domains` (`ALGEBRA | GEOMETRY | UNKNOWN`), `freeVariables` vs `boundVariables`, `requestedNumberDomain` vs `requiredNumberDomain` vs `effectiveNumberDomain`.
5. **Inspect limits & uncertainties:** Read `constraints`, `validationErrors`, and `diagnostics` (e.g., `AMBIGUOUS_CONSTANT_OR_VARIABLE`, `NUMBER_DOMAIN_CONFLICT`, `RADICAL_INDEX_PARITY_UNKNOWN`).
6. **Consult Insight Bank & initiate follow-up:** If helpful, the agent compares the passport against `insight-bank/` landmarks, checks whether applicability conditions hold in the source text, or initiates external lookup / clarification when `domains[0] === 'UNKNOWN'` or symbolic CAS verification is required.
7. **Return with context:** The agent reasons over the formula while respecting the constraints and boundaries recorded in the passport.

### How to Interpret Experimental Mathematical Insight Entries

- **Four distinct credibility statuses:** `VERIFIED` (proven foundational theorem), `DERIVED` (strictly derived from prior theorems), `CONJECTURE` (unproven hypothesis), and `ANALOGY` (useful comparison, **not** equivalence). These must never be merged or treated as UMFP classifier confidence levels (`domainClassification.confidence`).
- **Two independent verification layers:** **UMFP Passport Reproducibility** (a passport JSON comes from real `umfp-core` code) is strictly separate from **Mathematical Verification** (a mathematical proof holds under explicit conditions).
- **Pilot scope:** The initial 6 entries (`PTH-001`–`PTH-005`, `GEO-PYT-002`) are an early experimental seed under calibration, not a complete mathematical encyclopedia.

> **Important:** The current repository implements the deterministic UMFP `0.1.x` core, the pilot `insight-bank/` Markdown catalog, and a local Research Lab UI (with optional exploratory `/api/umfp/*` Gemini commentary endpoints in `server.ts`). External literature search, web lookup, and autonomous multi-step agents are **not** implemented in this repository.

---

## 5. What Does a `FormulaPassport` Contain?

| Field Group | Key Fields | Purpose |
| :--- | :--- | :--- |
| **Status & Identity** | `umfpVersion`, `parseStatus`, `structuralId`, `structuralSchemaId`, `canonicalExact`, `canonicalSchema`, `logicalClassId` | Deterministic canonical strings and index IDs (equivalence checks compare full canonical strings, never hashes alone). |
| **AST Pair** | `rawAst`, `normalizedAst` | `RAW AST` preserves grouping, linear/stacked notation, and original radicals; `NORMALIZED AST` unwraps groups, normalizes implicit square roots, and promotes known constants (`√2`, `π`, `e`, `φ`, `i`). |
| **Level A Features** | `features.structuralConstructs`, `features.operations`, `features.maximumCompositionDepth`, `features.maximumFractionDepth` | Counts and nesting depths of 10 structural constructs. |
| **Variables & Scope (Q2)** | `features.freeVariables`, `features.boundVariables`, `features.variableScopes`, `features.variables` | Lexical separation of free parameters vs declared binders (`INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`) with shadowing tracking; `variables` is retained as a sorted union for compatibility. |
| **Constants** | `constants` (`PassportConstantEntry[]`) | Registered mathematical constants (`π`, `e`, `φ`, `√2`, `√3`, `i`) with exact values, approximations, and minimal polynomials where applicable. |
| **Number Domain Provenance (Q3)** | `requestedNumberDomain`, `requiredNumberDomain`, `effectiveNumberDomain`, `numberDomain` | Separates caller intent (`REAL \| COMPLEX \| UNSPECIFIED`) from detected formula requirements without overwriting the user's request (`numberDomain` aliases `effectiveNumberDomain`). |
| **Level B & C** | `logicalOrganizations`, `domains`, `domainClassification`, `symmetryStatus` | Logical organization tags, restricted domain (`ALGEBRA \| GEOMETRY \| UNKNOWN`), classification confidence/reasons, and structural symmetry status. |
| **Safety & Diagnostics** | `constraints`, `validationErrors`, `diagnostics`, `fractionDetails` | Nonzero denominator requirements, radicand domain constraints, parse/validation errors, and ambiguity notices. |

---

## 6. Supported Domains

In `0.1.x`, `domains` and `domainClassification.primaryDomain` are strictly restricted to:

- **`ALGEBRA`** — scalar algebraic expressions, equations, fractions, radicals, and indexed scalar sums/products.
- **`GEOMETRY`** — assigned **only** via recognized geometric identities (e.g. `S = πr^2`, `V - E + F = 2`, `a^2 + b^2 = c^2`) or explicit caller `domainHint`.
- **`UNKNOWN`** — calculus constructs (`INTEGRAL`, `LIMIT`), linear algebra (`MATRIX`, `DETERMINANT`), general functions without geometric/algebraic rules, atomic identifiers, or failed parses.

The symbol $\pi$ alone does **not** imply `GEOMETRY` (e.g., `π + x` is classified as `ALGEBRA`).

---

## 7. Capabilities & Explicit Non-Goals

### What UMFP `0.1.x` Can Do
- Deterministically parse linear and LaTeX mathematical expressions into paired `RAW AST` and `NORMALIZED AST`.
- Detect 10 structural constructs (`FRACTION`, `RADICAL`, `ABSOLUTE_VALUE`, `MATRIX`, `DETERMINANT`, `INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`, `EQUATION_SYSTEM`).
- Distinguish free vs bound variables with lexical shadowing restoration across sums, products, integrals, and limits.
- Track number-domain provenance (`requested`, `required`, `effective`) and flag conflicts (`NUMBER_DOMAIN_CONFLICT`).
- Disambiguate registered constants (`π`, `e`, `φ`, `√2`, `√3`, `i`) conservatively against variables and subscripts.
- Compare two passports across structural relation, logical class relation, and conservative mathematical equivalence (`proven` only for canonical normalized identity without errors; `refuted` / `numerically_supported` via deterministic real sampling; `unknown` / `not_applicable` when symbolic CAS or complex branches are required).

### What UMFP Does **Not** Attempt To Do
UMFP is **not**:
- a Computer Algebra System (CAS) or symbolic simplifier/integrator;
- an automated theorem prover;
- a universal domain classifier for physics, statistics, finance, or arbitrary STEM fields;
- a literature search engine or formula encyclopedia.

---

## 8. Running the Project & Tests

### Prerequisites
- Node.js (v20+ recommended; tested on Node v22)
- `npm`

### Install Dependencies
```bash
npm install
```

### Run the Golden Test Suite (Core Verification)
Run all `123` deterministic core Golden Tests via `npm test`:
```bash
npm test
```

Optionally run the decoupled Semantic Transparency Extension tests (`src/umfp-semantic/`, see [`docs/SEMANTIC_TRANSPARENCY.md`](./docs/SEMANTIC_TRANSPARENCY.md)):
```bash
npm run test:semantic
```

### Independent Exploration of Experimental Branch (`experimental/semantic-transparency-v0.1.1`)
This branch carries an experimental, non-merged add-on (`src/umfp-semantic/`, `0.1.1-semantic-ext`) intended for independent auditing by external AI systems and researchers while keeping `src/umfp-core/` untouched:
- **Start here:** [`docs/experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_README.md`](./docs/experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_README.md) & [`EXPERIMENTAL_BRANCH.md`](./docs/experimental/semantic-transparency-v0.1.1/EXPERIMENTAL_BRANCH.md)
- **Testing & Limits:** [`INDEPENDENT_TESTING_PROTOCOL.md`](./docs/experimental/semantic-transparency-v0.1.1/INDEPENDENT_TESTING_PROTOCOL.md), [`KNOWN_LIMITATIONS.md`](./docs/experimental/semantic-transparency-v0.1.1/KNOWN_LIMITATIONS.md), and [`CHANGELOG.md`](./docs/experimental/semantic-transparency-v0.1.1/CHANGELOG.md)
- **Submit audit findings:** Use [`INDEPENDENT_REVIEW_TEMPLATE.md`](./docs/experimental/semantic-transparency-v0.1.1/INDEPENDENT_REVIEW_TEMPLATE.md) to report verified behaviors, reproducible counterexamples, and defects.

### TypeScript Check & Production Build
```bash
npm run lint
npm run build
```

### Run the Web Research Lab (Development vs Production)
Development mode (Express API + Vite middleware on `http://localhost:3000`):
```bash
npm run dev
```

Production mode (serves the compiled `dist/` bundle via Express on `http://localhost:3000` without launching Vite's dev server; run `npm run build` first):
```bash
npm run build
npm start
```

- The deterministic UMFP core (`src/umfp-core/*`) and all passport inspection/comparison tabs run completely locally without any API key.
- Optional exploratory AI commentary endpoints (`/api/umfp/audit`, `/api/umfp/compare` in `server.ts`) require `GEMINI_API_KEY` (see `.env.example`), return `503` gracefully if unconfigured, and always mark their output `aiProposed: true, verificationStatus: "unverified"`.

---

## 9. Current Development Stage (`0.1.x`)

UMFP is an **experimental pre-release research project (`0.1.x`) under active development and calibration** — not `1.0.0`. See [`docs/RESEARCH_STATUS.md`](./docs/RESEARCH_STATUS.md) for the full release status note.

| Stage | Scope | Status |
| :--- | :--- | :--- |
| **Core & Constant Registry** | RAW/NORMALIZED AST, 10 constructs, Constant Registry, A/B/C levels, comparator | Implemented & Verified |
| **Stage 1 (Q2)** | Free/bound variable classification, `variableScopes`, lexical shadowing | **Completed & Accepted** |
| **Stage 2 (Q3)** | Number domain provenance (`requested` / `required` / `effective`) | **Implemented & Verified** (`123/123` Golden Tests passing) |
| **Insight Bank (`0.1.x` Seed)** | Standalone Markdown landmark library (`PTH-001`–`PTH-005`, `GEO-PYT-002`) | **Initial Pilot Seed — Under Calibration** |
| **Stage 3 (Q4)** | Fractional & undefined radical index metadata (`1/2`, `1/0`) and index traversal cleanup | **Specified only — NOT yet implemented** |
| **Future (`0.2+`)** | Symbolic CAS / solver capabilities & broader domain extensions | Deferred (pending authorization) |

---

## 10. AI Agent Usage & Research Freedom

### 10.1 Primary Principle
UMFP is an open research and engineering instrument. Mathematical formulas, theorems, constants, and relationships themselves belong to mathematics, not to UMFP. AI agents, automated pipelines, and human researchers are free to use UMFP passports to organize, analyze, and reason about mathematical expressions in any independent or downstream research workflow.

### 10.2 Permitted Scenarios
Without requesting special permission, AI agents and researchers may use UMFP `0.1.x` for:
- **Formula orientation and structural triage** before invoking symbolic solvers, proof assistants, or literature search;
- **Separating surface notation from normalized structure** (`RAW AST` vs `NORMALIZED AST`), free vs bound variables (Q2), and number-domain provenance (Q3);
- **Contextualizing formulas in papers, textbooks, and codebases** alongside explicit domain constraints (`nonzero_denominator`, `radicand_domain`, `domain_unknown`) and `UNKNOWN` markers;
- **Comparing expressions** across structural relation, logical organization, and conservative mathematical equivalence;
- **Referencing Insight Bank landmarks** (`insight-bank/`) as curated orientation hints while independently verifying applicability conditions.

### 10.3 Integration Freedom
- Call `generatePassport`, `comparePassports`, or `compareExpressions` directly as a local TypeScript module inside agent toolchains or evaluation harnesses.
- Combine deterministic UMFP passports with external CAS tools, formal proof checkers, retrieval pipelines, or domain-specific ontologies without modifying `src/umfp-core/`.
- Keep any optional exploratory LLM commentary strictly separated from deterministic passport fields (`aiProposed: true, verificationStatus: "unverified"`).

### 10.4 `FormulaPassport` as Context Preservation
A `FormulaPassport` acts as a structured, reproducible snapshot of what was parsed (`rawAst`, `normalizedAst`), what structural constructs and variables were detected (`freeVariables`, `boundVariables`, `variableScopes`), which constants and number-domain requirements apply (`requestedNumberDomain`, `requiredNumberDomain`, `effectiveNumberDomain`), and what remained uncertain (`diagnostics`, `validationErrors`, `UNKNOWN`). Preserving the passport alongside downstream reasoning keeps later steps anchored to explicit assumptions instead of silent re-guessing. *(Note: Optional external catalog/provenance fields discussed for future workflows — such as `formula_id`, `formula_version`, `passport_version`, `source_type`, or `source_reference` — are **not** implemented in `0.1.x` `umfp-core` and remain non-implemented future ideas only.)*

### 10.5 Mass Passportization & Local Catalogs
Researchers and agents may batch-run `generatePassport` over local formula corpora to build private or shared JSON catalogs and regression benchmarks (see [`docs/FORMULA_CATALOG.md`](./docs/FORMULA_CATALOG.md) for a reproducible 24-formula catalog generated directly from `src/umfp-core/`). Catalogs should record the `umfpVersion` and `ParseContext` used so every passport remains reproducible.

### 10.6 Reliability Boundaries
Using UMFP responsibly requires preserving these non-negotiable boundaries:
- **`Structural Classification != Mathematical Proof`:** Assigning `FRACTION`, `RATIONAL_EXPRESSION`, or `ALGEBRA` describes syntax and organization, not theorem validity.
- **`Passport Reproducibility != Mathematical Truth`:** Generating identical `FormulaPassport` JSON across runs confirms deterministic software behavior, not mathematical truth of the input formula.
- **`Numeric Sampling != Formal Proof`:** `mathematicalEquivalence.status === 'numerically_supported'` (`proofMethod: 'numeric_sampling'`) means no counterexample was found on the deterministic real sample table — it is **not** a formal algebraic proof.
- **`Insight Bank Entry != Universal Guarantee`:** Credibility labels (`VERIFIED`, `DERIVED`, `CONJECTURE`, `ANALOGY`) are distinct, and `ANALOGY` never implies equivalence.
- **`AI Hypothesis != Deterministic Core`:** Output from `/api/umfp/audit` or `/api/umfp/compare` is always unverified exploratory commentary.

### 10.7 Apache-2.0 Attribution & Scope Clarification
The **Apache License, Version 2.0** ([`./LICENSE`](./LICENSE)) governs the UMFP software implementation, UI, and repository documentation. Consistent with Apache-2.0, you are free to use, modify, and redistribute the software under its license terms (retaining copyright, license, and notice attributions where required). **This license applies to the UMFP codebase and artifacts — it does not assert ownership or copyright restrictions over mathematical formulas, theorems, proofs, or independent research results produced using UMFP.**

### 10.8 Project Philosophy
> *"UMFP does not claim ownership of mathematical ideas. It provides a common structural language for describing mathematical formulas — freely usable by AI agents and researchers in their own work."*

---

## 11. License

Licensed under the **Apache License, Version 2.0** — see [`./LICENSE`](./LICENSE) for the full license text.

- Package metadata (`package.json`): `"license": "Apache-2.0"`
- Source files carry `SPDX-License-Identifier: Apache-2.0`
- As stated in Section 10.7, Apache-2.0 applies to the UMFP software and repository files, not to mathematical ideas, formulas, or independent research outputs.

---

## 12. Preprint & Citation

The conceptual foundations and technical architecture of UMFP are published on Zenodo as an open-access preprint:

- **Title:** *Universal Mathematical Formula Passport (UMFP): A Structural and Domain-Oriented Representation Layer for AI-Assisted Mathematical Workflows*
- **Author:** Andrey Artsybashev ([@a50kv109](https://github.com/a50kv109))
- **Zenodo DOI:** [10.5281/zenodo.24448675](https://doi.org/10.5281/zenodo.24448675) *(Concept DOI: [10.5281/zenodo.24448674](https://doi.org/10.5281/zenodo.24448674))*
- **Repository Snapshot Commit:** [`1816b476560a548eb8eb9a2d12fb58dc1af124dd`](https://github.com/a50kv109/universal-Mathematical-formula-Passport/commit/1816b476560a548eb8eb9a2d12fb58dc1af124dd)
- **Publication Date:** November 22, 2026
- **Preprint License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

### APA Citation
```text
Artsybashev, A. (2026). Universal Mathematical Formula Passport (UMFP): A Structural and Domain-Oriented Representation Layer for AI-Assisted Mathematical Workflows (Version v1.0-preprint). Zenodo. https://doi.org/10.5281/zenodo.24448675
```

### BibTeX
```bibtex
@article{artsybashev2026umfp,
  author       = {Artsybashev, Andrey},
  title        = {{Universal Mathematical Formula Passport (UMFP): A Structural and Domain-Oriented Representation Layer for AI-Assisted Mathematical Workflows}},
  year         = {2026},
  publisher    = {Zenodo},
  version      = {v1.0-preprint},
  doi          = {10.5281/zenodo.24448675},
  url          = {https://doi.org/10.5281/zenodo.24448675}
}
```


