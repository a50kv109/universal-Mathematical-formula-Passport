# UMFP `0.1.x` — Research Status

**Project Status:** `UMFP 0.1.x — Experimental Research Release` *(Pre-release / Under Calibration)*

This document summarizes the current engineering and mathematical status of UMFP `0.1.x`, separating verified core components, experimental calibration artifacts, and unimplemented specifications.

---

## 1. Current Engineering & Research State

- **Active Calibration Phase:** UMFP `0.1.x` is an experimental research system actively undergoing structural and mathematical calibration. It is **not** a `1.0.0` production release.
- **Core Pipeline (`src/umfp-core/`):**
  - Deterministic parser (`RAW AST` / `NORMALIZED AST`), 10 structural constructs, Constant Registry, 3-level analysis (**A**: structure, **B**: logical organization, **C**: domain `ALGEBRA | GEOMETRY | UNKNOWN`), and conservative equivalence comparator are implemented.
  - **Q2 (Variable Binding & Lexical Scope):** Completed and accepted (`freeVariables`, `boundVariables`, `variableScopes`, backward-compatible `variables`, lexical shadowing across `INDEXED_SUM`, `INDEXED_PRODUCT`, `INTEGRAL`, `LIMIT`).
  - **Q3 (Number Domain Provenance):** Completed and accepted (`requestedNumberDomain`, `requiredNumberDomain`, `effectiveNumberDomain`, compatible `numberDomain` alias, and real-only sampling guard).
  - **Regression Suite:** Verified against `123/123` deterministic Golden Tests (`failed=0`), `npm run lint` (`tsc --noEmit`), and `npm run build`.
- **Stage 3 — Q4 (Radical Index Metadata & Traversal):** **Specified only — NOT yet implemented.** Fractional and undefined radical indices (`1/2`, `1/0`) remain on baseline `0.1.x` behavior pending separate authorization (see [`SPECIFICATION.md`](./SPECIFICATION.md) and [`ROADMAP.md`](./ROADMAP.md)).
- **Deferred Capabilities (`0.2+`):** Symbolic CAS, automated theorem proving, domain extensions beyond `ALGEBRA | GEOMETRY | UNKNOWN`, complex radical branch modeling, and autonomous external search agents are **not** implemented.

---

## 2. Insight Bank Status (`insight-bank/`)

- **Role:** `Insight Bank` has been created as a standalone, non-computational Markdown library of mathematical orientation landmarks for AI agents, separated cleanly from `src/umfp-core/` and [`FORMULA_CATALOG.md`](./FORMULA_CATALOG.md).
- **Pilot Scope:** Designated as an **`Initial Experimental Knowledge Seed`**. The initial pilot corpus contains **6 entries** in a single thematic family (`PYTHAGOREAN FAMILY`: `PTH-001` through `PTH-005` and `GEO-PYT-002`).
- **Incompleteness:** The catalog and Insight Bank are initial pilot corpora and **do not claim mathematical completeness**.
- **Credibility Statuses:** Entries carry distinct credibility statuses (`VERIFIED`, `DERIVED`, `CONJECTURE`, `ANALOGY`). These statuses must **never** be merged or confused with UMFP classifier confidence (`domainClassification.confidence`).
- **Standards for New Entries:** All future additions require explicit mathematical proof or derivation verification, clear notation definitions, and explicit applicability conditions / failure boundaries.

---

## 3. Two Independent Kinds of Verification

UMFP separates two orthogonal verification dimensions:

1. **UMFP Passport Reproducibility** — confirms that a `FormulaPassport` excerpt was generated deterministically by running `generatePassport(expression, context)` on the actual `src/umfp-core/` code.
2. **Mathematical Verification** — confirms the validity of a mathematical theorem, derivation, or numerical check under explicitly stated geometric/algebraic assumptions.

**Rule:** Generating a `FormulaPassport` for a formula never constitutes mathematical proof of that formula, and conversely an Insight Bank derivation never alters or overrides the deterministic domain/structural classification produced by `UMFP Core`.

---

## 4. Repository Readiness & Publication Status

- **Zenodo Preprint Publication:** The foundational research preprint is published on Zenodo under DOI [`10.5281/zenodo.24448675`](https://doi.org/10.5281/zenodo.24448675) (author: Andrey Artsybashev, snapshot commit: `1816b476560a548eb8eb9a2d12fb58dc1af124dd`, Creative Commons Attribution 4.0 International).
- **License & Package Identity (`LICENSE` / `package.json`):** Root [`/LICENSE`](../LICENSE) contains the full **Apache License, Version 2.0** text; `package.json` identifies `"name": "umfp"`, `"version": "0.1.0"`, `"license": "Apache-2.0"`, and includes `npm test` (`123/123` Golden Tests) plus `npm start` (`NODE_ENV=production node server.ts` serving `dist/`).
- **UI Presentation Polish:** `src/App.tsx` displays `0.1.x — Experimental Research Release` and exposes full Q2/Q3 passport fields in the Inspector JSON tab; dedicated visual badges/panels for `variableScopes` and Q3 domain provenance in the main UI remain optional future UI polish outside `umfp-core`.
- **Stage 3 (Q4) & `0.2+` Work:** Intentionally unimplemented until separate authorization.

> **Disclaimer:** *UMFP is an experimental research project. Its classifications and mathematical insight entries are intended to support further investigation, not to replace independent mathematical verification.*
