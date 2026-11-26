# UMFP Design Proposal: Canonical Notation Guidance (`0.1.x` Extension Concept / Issue #1)

> **Status:** **Design Proposal & Architectural Specification (Unimplemented Concept)**
> 
> *This document defines a proposed non-breaking extension layer for UMFP ("Canonical Notation Profile / Notation Convention Guidance"). It does **not** alter `src/umfp-core/`, the TypeScript `FormulaPassport` contract, the AST parser, the domain classifier, or the equivalence comparator in UMFP `0.1.x`. It addresses how AI agents can reconcile source-supplied notation with established mathematical conventions without overriding user intent.*

---

## 1. Motivation and Problem Statement

Currently, UMFP `0.1.x` provides deterministic structural паспортизация (AST, logical organization, domain classification, variable scoping via Q2, number domain provenance via Q3, and validation constraints). 

However, mathematical and scientific formulas frequently appear in source texts using idiosyncratic, arbitrary, or localized variable names (e.g., a paper might denote the hypotenuse of a right triangle as $h$, $d$, or $z$, or use $x_1, x_2, x_3$ for triangle sides). When an AI agent reasons about or interacts with such formulas in geometry solvers, educational systems, or symbolic pipelines, it needs more than structural correctness:

> **An AI agent needs guidance to recognize and recommend established canonical notations for an identified formula or mathematical context, while strictly preserving the author's original notation.**

Without this separation, automated agents either:
1. blindly assume arbitrary variable assignments (e.g., treating any side variable as the hypotenuse); or
2. rewrite user formulas without warning, breaking consistency with the source text.

---

## 2. Core Principles of Canonical Notation Guidance

1. **Preservation of Original Source:** The original formula string, raw AST, and normalized AST must never be overwritten, renamed, or modified silently.
2. **Separation of Concerns:** Notation guidance is an **external advisory profile** (metadata annotation), entirely separate from syntactic parsing, AST normalization, domain classification (`ALGEBRA | GEOMETRY | UNKNOWN`), and mathematical equivalence testing.
3. **Relational Context Requirement:** Conventions (such as the Pythagorean triple or right triangle side-vertex correspondence) are relational. A symbol cannot be mapped to a canonical role (like "hypotenuse") based on syntax alone if multiple interpretations or alternative conventions exist.
4. **Honest Ambiguity (`UNKNOWN / AMBIGUOUS`):** If the source context lacks sufficient information to determine vertex-side orientation or convention mapping, the system must return `AMBIGUOUS` or `UNAVAILABLE` rather than guessing.
5. **No Universal Dogmatism:** There is no single universal convention across all disciplines, languages, and textbooks. Guidance must cite its information source (e.g., standard Euclidean geometry textbook convention, ISO standards, or domain-specific custom profiles) and support alternatives.

---

## 3. Conceptual Definitions

To formalize notation guidance, UMFP defines six distinct concepts:

| Concept | Term (Ru) | Definition |
| :--- | :--- | :--- |
| **Original Notation** | Исходная нотация | Exactly what the user or source document wrote; preserved verbatim without alteration. |
| **Recognized Convention** | Признанная конвенция | A named, source-backed mathematical convention or formula family (e.g., *Euclidean Right Triangle Vertex-Side Convention*), including its domain and applicability conditions. |
| **Recommended Notation** | Рекомендуемая нотация | Standard standard/canonical symbol naming suggested when context and evidence are sufficient. |
| **Symbol Mapping** | Сопоставление символов | Explicit mapping from original symbols to recommended canonical symbols, accompanied by justification and confidence level. |
| **Ambiguity / Conflict** | Неоднозначность / конфликт | Insufficient context, conflicting conventions, or unresolvable orientation, resulting in `AMBIGUOUS` or `UNAVAILABLE` status. |
| **Information Source** | Источник информации | Bibliographic reference, standard (ISO/IEC), textbook convention, or project-local guideline supporting the recommendation. |

---

## 4. Worked Example: Pythagorean Theorem & Right Triangles

### 4.1 The Standard Euclidean Convention
In standard Euclidean geometry for a right-angled triangle:
- **Vertices:** $A, B, C$ (counterclockwise or standard ordering).
- **Opposing Sides:** $a, b, c$ such that side $a$ is opposite vertex $A$, side $b$ is opposite vertex $B$, and side $c$ is opposite vertex $C$.
- **Angles:** $\alpha, \angle A$; $\beta, \angle B$; $\gamma, \angle C$.
- **Right Angle Condition:** When $\gamma = 90^\circ$ (or $\angle C = \pi/2$), side $c$ is the **hypotenuse**, and sides $a$ and $b$ are the **legs** (catheti).
- **Pythagorean Relation:** $a^2 + b^2 = c^2$.

### 4.2 Why Relational Context Matters
Consider an equation given in a source text:
$$\xi^2 + \eta^2 = \zeta^2$$
- **Structural UMFP Passport:** Classifies the expression as `GEOMETRY` (if identified via Pythagorean identity) or `ALGEBRA`, identifying three free variables `['\xi', '\eta', '\zeta']`.
- **The Pitfall of Arbitrary Assignment:** If an AI agent arbitrarily assigns $\zeta$ as the hypotenuse and $\xi, \eta$ as the legs without knowing vertex orientation or angle definitions, any subsequent geometric query (e.g., computing the altitude to the hypotenuse, finding opposite angles $\alpha$ and $\beta$, or decomposing into sub-triangles) will produce geometric errors or contradiction.
- **Canonical Notation Guidance Behavior:**
  - **Original Notation:** $\xi, \eta, \zeta$
  - **Recognized Convention:** *Euclidean Right Triangle Pythagorean Relation*
  - **Recommendation Status:** `ALTERNATIVES_AVAILABLE` or `AMBIGUOUS` (unless the source explicitly states $\zeta$ is opposite the $90^\circ$ vertex).
  - **Mapping:** If sufficient context is provided (e.g., text states "let $c$ be denoted $\zeta$ and correspond to the hypotenuse opposite the right angle"), the profile maps $\zeta \to c$ (hypotenuse), $\xi \to a$ (leg), $\eta \to b$ (leg), while keeping the original formula string untouched. If orientation is unknown, it refuses to guess.

---

## 5. Proposed Metadata Structure (Design Sketch Only)

*Note: This schema is an exploratory design sketch for future versions (`0.2+`) and is **not** part of the active TypeScript `FormulaPassport` contract in `0.1.x`.*

```ts
export type RecommendationStatus = 'RECOMMENDED' | 'ALTERNATIVES_AVAILABLE' | 'AMBIGUOUS' | 'UNAVAILABLE';

export interface NotationMappingEntry {
  originalSymbol: string;
  recommendedCanonicalSymbol: string;
  roleDescription: string; // e.g., 'hypotenuse', 'leg_a', 'vertex_A'
  confidence: number;      // 0.0 to 1.0
  justification: string;
}

export interface NotationProfile {
  notationProfileId: string;
  conventionName: string;       // e.g., 'Euclidean Right Triangle Standard Convention'
  conventionDomain: string;     // e.g., 'GEOMETRY_EUCLIDEAN'
  informationSource: string;    // e.g., 'Standard geometry textbook convention (e.g., Hilbert / standard curriculum)'
  recommendationStatus: RecommendationStatus;
  symbolMappings: NotationMappingEntry[];
  applicabilityConditions: string[];
  ambiguityNotes?: string;
}
```

---

## 6. Summary of Guarantees

1. **No Core Mutation:** `src/umfp-core/` and `FormulaPassport` remain pure and deterministic.
2. **No Silent Rewriting:** The formula string and AST are never altered.
3. **Safe Fallbacks:** When orientation or convention cannot be proven from context, the system defaults to `AMBIGUOUS` or `UNAVAILABLE`.
