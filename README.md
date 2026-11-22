# UMFP — Universal Mathematical Formula Passport (`0.1.x`)

> **An intermediate mathematical orientation and passportization layer between raw mathematical notation and AI-agent reasoning.**

[Русская версия (README.ru.md)](./README.ru.md) · [Project Purpose](./docs/PROJECT_PURPOSE.md) · [Architecture](./docs/ARCHITECTURE.md) · [Specification](./docs/SPECIFICATION.md) · [Roadmap](./docs/ROADMAP.md) · [Formula Catalog (24 Verified Examples)](./docs/FORMULA_CATALOG.md) · [Insight Bank](./insight-bank/README.md)

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

## 4. How an AI Agent Can Use UMFP

UMFP acts as a **structured orientation anchor**, not an automated mathematician:

```text
Formula ─▶ UMFP ─▶ Formula Passport ─▶ AI Agent ─▶ Further Investigation
```

### Intended Integration Workflow *(Conceptual Pattern — External Search/Agents Are Not Built Into `0.1.x`)*

1. **Receive formula:** An AI agent extracts a raw formula from a document or user prompt.
2. **Request passport:** The agent calls `generatePassport(expression, context)` from `src/umfp-core/passport.ts`.
3. **Inspect Level A & Level B:** Identify structural constructs (`FRACTION`, `INTEGRAL`, `MATRIX`, etc.) and logical organizations.
4. **Inspect Level C, variables & provenance:** Check `domains` (`ALGEBRA | GEOMETRY | UNKNOWN`), `freeVariables` vs `boundVariables`, `requestedNumberDomain` vs `requiredNumberDomain` vs `effectiveNumberDomain`.
5. **Inspect limits & uncertainties:** Read `constraints`, `validationErrors`, and `diagnostics` (e.g., `AMBIGUOUS_CONSTANT_OR_VARIABLE`, `NUMBER_DOMAIN_CONFLICT`, `RADICAL_INDEX_PARITY_UNKNOWN`).
6. **Initiate follow-up:** If `domains[0] === 'UNKNOWN'` or symbolic CAS verification is required, the agent uses the passport as structured grounding to search literature, ask the user for declarations, or invoke a specialized external tool.
7. **Return with context:** The agent reasons over the formula while respecting the constraints and boundaries recorded in the passport.

> **Important:** The current repository implements the deterministic UMFP `0.1.x` core and a local Research Lab UI (with optional exploratory `/api/umfp/*` Gemini commentary endpoints in `server.ts`). External literature search, web lookup, and autonomous multi-step agents are **not** implemented in this repository.

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
There is no custom `npm test` alias in `package.json`; run the deterministic golden test suite directly via `tsx`:
```bash
npx tsx -e "import { runAllGoldenTests } from './src/umfp-core/golden-tests'; const s = runAllGoldenTests(); console.log(s.passed + '/' + s.total, 'failed=' + s.failed); if (s.failed) process.exit(1);"
```

### TypeScript Check & Production Build
```bash
npm run lint
npm run build
```

### Run the Web Research Lab (Optional UI + Exploratory AI Endpoints)
```bash
npm run dev
```
This starts the Express + Vite server on `http://localhost:3000`.
- The deterministic UMFP core (`src/umfp-core/*`) and all passport inspection/comparison tabs run completely locally without any API key.
- Optional exploratory AI commentary endpoints (`/api/umfp/audit`, `/api/umfp/compare` in `server.ts`) require `GEMINI_API_KEY` (see `.env.example`) and always mark their output `aiProposed: true, verificationStatus: "unverified"`.

---

## 9. Current Development Stage (`0.1.x`)

UMFP is an **early-stage pre-release research core (`0.1.x`)** — not `1.0.0`.

| Stage | Scope | Status |
| :--- | :--- | :--- |
| **Core & Constant Registry** | RAW/NORMALIZED AST, 10 constructs, Constant Registry, A/B/C levels, comparator | Implemented & Verified |
| **Stage 1 (Q2)** | Free/bound variable classification, `variableScopes`, lexical shadowing | **Completed & Accepted** |
| **Stage 2 (Q3)** | Number domain provenance (`requested` / `required` / `effective`) | **Implemented & Verified** (`123/123` Golden Tests passing) |
| **Stage 3 (Q4)** | Fractional & undefined radical index metadata (`1/2`, `1/0`) and index traversal cleanup | **Specified only — NOT yet implemented** |
| **Future (`0.2+`)** | Symbolic CAS / solver capabilities & broader domain extensions | Deferred (pending authorization) |

---

## License

> **Notice for Repository Maintainers:** No `LICENSE` file is currently present in this repository. Please select and add an explicit license file before public GitHub distribution.
