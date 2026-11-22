# UMFP Insight Bank — Specification (`0.1.x`)

> **A curated repository of verified mathematical patterns, geometric extensions, derived relations, and explicitly bounded analogies serving as intellectual orientation landmarks for AI agents.**

[Index of Entries](./INDEX.md) · [UMFP Core Architecture](../docs/ARCHITECTURE.md) · [Formula Catalog (Engine Demo)](../docs/FORMULA_CATALOG.md)

---

## 1. Purpose and Architectural Boundary

**UMFP Insight Bank** complements the deterministic `umfp-core` engine without modifying or replacing it:

```text
Formula ─▶ UMFP Core (src/umfp-core) ─▶ Formula Passport ─▶ AI Agent ◀─▶ Insight Bank (insight-bank/)
                                                                │
                                                                ▼
                                                   Further Investigation & Verification
```

### Strict Separation of Responsibilities

| Component | Role | Does NOT Do |
| :--- | :--- | :--- |
| **UMFP Core (`src/umfp-core`)** | Deterministic AST parsing, Levels A/B/C classification, Q2 scopes, Q3 domain provenance, conservative equivalence | Does not consult `insight-bank/`, does not guess unstated geometry |
| **`docs/FORMULA_CATALOG.md`** | Operational demonstration of how `generatePassport` classifies 24 reference inputs | Does not serve as a mathematical theorem library |
| **Insight Bank (`insight-bank/`)** | Compact, human-audited Markdown library of mathematical ideas, proofs, applicability bounds, and real UMFP passport links | Never overrides a `FormulaPassport`, never injects runtime rules, never turns analogies into proofs |

---

## 2. Four Thematic Categories

Every insight belongs to one primary category:

1. **`Classical Patterns`** — Foundational mathematical theorems and canonical constructions (e.g., Pythagorean theorem $a^2 + b^2 = c^2$).
2. **`Geometric Extensions`** — Geometric transfers, scaling laws, and spatial interpretations (e.g., similar figures, circles, or equilateral triangles built on triangle sides).
3. **`Mathematical Relations`** — Non-obvious derived equalities connecting quantities (e.g., square roots of areas linked with the incircle radius; altitude projections on the hypotenuse).
4. **`Cross-Domain Analogies`** — Structural or conceptual parallels across domains (e.g., quadratic scaling laws). **Strict rule:** an analogy must never be presented as a proven identity.

---

## 3. Credibility Status System

To prevent interesting heuristics from masquerading as proven theorems, every entry MUST carry exactly one credibility status:

| Status | Meaning | Requirement |
| :--- | :--- | :--- |
| `VERIFIED` | Mathematically proven theorem or rigorously established result | Complete proof or canonical reference provided |
| `DERIVED` | Strictly derived from established theorems | Step-by-step derivation included in the entry |
| `CONJECTURE` | Open hypothesis or unverified pattern | Must explicitly state that no proof exists |
| `ANALOGY` | Useful structural or conceptual comparison | Must explicitly warn that it is **not** a mathematical proof |

---

## 4. Two Distinct Link Types (`Relations`)

Inside each entry, links to other insights or expressions are strictly partitioned into:

- **`Mathematical equivalence`** — Expressions or theorems that are mathematically equivalent or mutually derivable **under the explicitly stated conditions** (e.g., $\sqrt{C} + \sqrt{D} = \sqrt{A} + \sqrt{B}$ and $r = \frac{a+b-c}{2}$ under the right-triangle four-circle construction).
- **`Structural analogy`** — Expressions that share surface algebraic or compositional shape (e.g., $A + B = C$ vs. $a^2 + b^2 = c^2$ vs. $S_A + S_B = S_C$) without implying automatic equivalence outside their geometric definitions.

---

## 5. Standard 10-Section Entry Template

Every Markdown file inside `insight-bank/` MUST follow this unified 10-section structure:

1. **ID и название** (ID, Title, Category, Credibility Status, Family/Topic)
2. **Исходная математическая идея** (Core Mathematical Idea)
3. **Формулы** (Canonical Formulas)
4. **Геометрическая или алгебраическая интерпретация** (Geometric or Algebraic Interpretation + optional figure)
5. **Доказательство либо ссылка на обоснование** (Proof / Step-by-step Derivation)
6. **Условия применимости** (Explicit Applicability Conditions)
7. **Примеры** (Worked / Numerical Verification Examples)
8. **Известные ограничения** (Known Limitations & Failure Modes — where the pattern breaks)
9. **Статус проверки и связи** (Verification Status, `Mathematical equivalence` vs. `Structural analogy`)
10. **Связанные паспорта UMFP и польза для агента** (Actual `UMFP 0.1.x` `generatePassport` outputs + Concrete AI-Agent Orientation Guidance)

---

## 6. Directory Layout

```text
insight-bank/
├── README.md                              # This specification
├── INDEX.md                               # Registry of all entries
├── assets/                                # Reference diagrams (read-only visual aids)
│   └── pythagorean-four-circles.png
├── geometry/
│   └── pythagorean-family/
│       ├── PTH-001.md                     # Classical Pythagorean Theorem
│       ├── PTH-002.md                     # Similar Figures on Right Triangle Sides
│       ├── PTH-003.md                     # Circles Inscribed in Squares on Sides
│       ├── PTH-004.md                     # Four Circles: Side Circles + Incircle (3-4-5 + proof)
│       ├── PTH-005.md                     # Altitude & Projections onto Hypotenuse
│       └── GEO-PYT-002.md                 # Equilateral Triangle Construction
├── algebra/                               # Reserved for future algebraic insights
└── general/                               # Reserved for cross-domain analogies
```

---

## 7. How an AI Agent Should Use Insight Bank

1. First call `generatePassport(expression, context)` from `src/umfp-core/passport.ts` to obtain deterministic structural, logical, variable-scope, and domain-provenance facts.
2. Notice when UMFP conservatively classifies a geometric relation written purely in area/length symbols (e.g., `\sqrt{C} + \sqrt{D} = \sqrt{A} + \sqrt{B}` or `S_A + S_B = S_C`) as **`ALGEBRA`** rather than `GEOMETRY` because UMFP `0.1.x` does not guess unstated geometry.
3. Match the passport's structural pattern (`RADICAL: 4`, `EQUATION_RELATION`, `POWER_DEPENDENCE`, `FRACTION: 1`, `MATH_CONST_PI`, `MATH_CONST_SQRT3`) against `insight-bank/INDEX.md`.
4. Treat the matched entry strictly as an **orientation hypothesis**: verify the entry's **Applicability Conditions** (e.g., right angle, common scaling factor $k$, specific symbol definitions) against the source document or user prompt before claiming geometric meaning.
