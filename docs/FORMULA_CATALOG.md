# UMFP Formula Catalog — 24 Verified Reference Examples (`0.1.x`)

This catalog is an **operational behavior corpus** for developers and AI agents integrating with UMFP.
Every `FormulaPassport` excerpt below was generated **directly by executing `generatePassport(expression, context)` on the current UMFP `0.1.x` codebase** (`123/123` Golden Tests passing). No JSON values were hand-authored.

---

## How an AI-Agent Developer Should Read This Catalog

```ts
import { generatePassport } from '../src/umfp-core/passport';

const passport = generatePassport(expression, {
  // Optional caller context:
  // numberDomain: 'REAL' | 'COMPLEX' | 'UNSPECIFIED',
  // declaredVariables: ['i', 'e'],
  // domainHint: 'ALGEBRA' | 'GEOMETRY' | 'UNKNOWN',
});
```

### Key Decision Rules for Agents
1. **Check `parseStatus` and `validationErrors` first:** If `parseStatus === 'failed'` or `validationErrors.length > 0`, the expression has syntactic or domain validity errors (e.g., `INVALID_DOMAIN`).
2. **Use `features.structuralConstructs` (Level A) to recognize notation:** Identify `FRACTION`, `RADICAL`, `MATRIX`, `INDEXED_SUM`, etc., before deciding what tools or queries are relevant.
3. **Use `logicalOrganizations` (Level B) and `domains[0]` (Level C) separately:**
   - Do **not** assume `UNKNOWN` is an error: UMFP intentionally leaves `MATRIX`, `DETERMINANT`, `INTEGRAL`, `LIMIT`, and ambiguous `|a - b|` as `UNKNOWN` in `0.1.x` rather than guessing.
   - When `domains[0] === 'UNKNOWN'` or `diagnostics` reports ambiguity (`AMBIGUOUS_CONSTANT_OR_VARIABLE`, `AMBIGUOUS_BAR_CONSTRUCT`, `RADICAL_INDEX_PARITY_UNKNOWN`), trigger **external lookup or user clarification**.
4. **Use `freeVariables` vs. `boundVariables`:** Treat `freeVariables` as external parameters and `boundVariables` as local construct-scoped dummies.
5. **Check `requestedNumberDomain` vs. `requiredNumberDomain` vs. `effectiveNumberDomain`:** Detect silent domain escalation (`NUMBER_DOMAIN_CONFLICT` or `COMPLEX_DOMAIN_INFERRED`).
6. **Remember:** A passport is a **structured orientation anchor**, never a mathematical proof.

---

## Catalog Index (24 Verified Examples)

| ID | Formula | Level A Constructs | Level B (Primary / All) | Level C Domain | Key Highlight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CAT-01` | `(a + b)^2` | `—` | `POWER_DEPENDENCE`, `FACTORISATION`, `SYMMETRY` | `ALGEBRA` | Scalar symmetric factored power |
| `CAT-02` | `2x + 3y - 5` | `—` | `DIFFERENCE` | `ALGEBRA` | Linear affine polynomial |
| `CAT-03` | `(a + b)^2 = a^2 + 2ab + b^2` | `—` | `EQUATION_RELATION`, `POWER_DEPENDENCE`, `FACTORISATION`, `SYMMETRY` | `ALGEBRA` | Symmetric algebraic identity |
| `CAT-04` | `\frac{a+b}{c-d}` | `FRACTION: 1` | `RATIONAL_EXPRESSION` | `ALGEBRA` | Stacked composite fraction + constraint |
| `CAT-05` | `a/b` | `—` | `RATIONAL_EXPRESSION`, `QUOTIENT` | `ALGEBRA` | Atomic `BINARY_DIV` (not `FRACTION`) |
| `CAT-06` | `\frac{1}{x} + \frac{1}{y} = \frac{1}{z}` | `FRACTION: 3` | `EQUATION_RELATION`, `RATIONAL_EXPRESSION` | `ALGEBRA` | Multi-fraction equation, 3 constraints |
| `CAT-07` | `\sqrt{x}` (`REAL`) | `RADICAL: 1` | `RADICAL_DEPENDENCE` | `ALGEBRA` | Implicit index 2 -> `x >= 0` |
| `CAT-08` | `\sqrt[3]{a+b}` (`REAL`) | `RADICAL: 1` | `RADICAL_DEPENDENCE`, `SYMMETRY` | `ALGEBRA` | Odd degree 3 -> no `>= 0` constraint |
| `CAT-09` | `\sqrt[n]{x}` (`REAL`) | `RADICAL: 1` | `RADICAL_DEPENDENCE` | `ALGEBRA` | Symbolic index parity -> `domain_unknown` |
| `CAT-10` | `\sqrt{-1}` (`REAL`) | `RADICAL: 1` | `RADICAL_DEPENDENCE` | `ALGEBRA` | `INVALID_DOMAIN` without rewriting `requested` |
| `CAT-11` | `\|a - b\|` | `ABSOLUTE_VALUE: 1` | `UNKNOWN` | `ALGEBRA` | Level B `UNKNOWN` (`AMBIGUOUS_BAR_CONSTRUCT`) |
| `CAT-12` | `[[a,b],[c,d]]` | `MATRIX: 1` | `MATRIX_TRANSFORMATION` | `UNKNOWN` | Recognized structure, domain `UNKNOWN` |
| `CAT-13` | `det(A)` | `DETERMINANT: 1` | `DETERMINANT_STRUCTURE` | `UNKNOWN` | `MATRIX_SQUARENESS_UNVERIFIED` |
| `CAT-14` | `sum(i=1..n, i)` | `INDEXED_SUM: 1` | `INDEXED_AGGREGATION` | `ALGEBRA` | Bound `i` vs free `n` |
| `CAT-15` | `sum(i=1..n, sum(i=1..m, i) + i)` | `INDEXED_SUM: 2` | `INDEXED_AGGREGATION`, `COMPOSITION` | `ALGEBRA` | Nested shadowing & scope restoration |
| `CAT-16` | `prod(k=1..n, k * x)` | `INDEXED_PRODUCT: 1` | `INDEXED_AGGREGATION` | `ALGEBRA` | Bound `k` vs free `n, x` |
| `CAT-17` | `int(a,b,f(x),x)` | `INTEGRAL: 1` | `INTEGRAL_TRANSFORMATION` | `UNKNOWN` | Bound `x` in integrand, free `a, b` |
| `CAT-18` | `lim(x->a, f(x))` | `LIMIT: 1` | `LIMIT_PROCESS` | `UNKNOWN` | Bound `x` in body, free `a` in approach |
| `CAT-19` | `{x+y=5, x-y=1}` | `EQUATION_SYSTEM: 1` | `EQUATION_RELATION` | `ALGEBRA` | Coupled system container |
| `CAT-20` | `S = πr^2` | `—` | `EQUATION_RELATION`, `POWER_DEPENDENCE` | `GEOMETRY` | Circle area `known_identity` + `MATH_CONST_PI` |
| `CAT-21` | `V - E + F = 2` | `—` | `EQUATION_RELATION`, `INVARIANT` | `GEOMETRY` | Euler polyhedron `known_identity` |
| `CAT-22` | `π + x` | `—` | `SUMMATION` | `ALGEBRA` | `π` alone does **not** trigger `GEOMETRY` |
| `CAT-23` | `i^2 = -1` (`REAL`) | `—` | `EQUATION_RELATION`, `POWER_DEPENDENCE` | `ALGEBRA` | `NUMBER_DOMAIN_CONFLICT` (`REAL` -> `COMPLEX`) |
| `CAT-24` | `a + i` (`REAL`) | `—` | `SYMMETRY`, `SUMMATION` | `ALGEBRA` | Ambiguous `i` kept as variable in `REAL` |

---

## Detailed Passport Entries

### `CAT-01` — Factored Power Expression
- **Formula:** `(a + b)^2` (context: `{}`)
- **Description:** Binomial square in factored scalar form.
- **Level A (Structural Constructs):** `{}` (no composite constructs; binary `+`, `^`, `group` in `rawAst`).
- **Level B (Logical Organization):** `["POWER_DEPENDENCE", "FACTORISATION", "SYMMETRY"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.F4F6CC",
  "structuralSchemaId": "UMFP.SCH.ALG.25685E",
  "logicalClassId": "UMFP.LC.POWER_DEPENDENCE.30CF",
  "structuralConstructs": {},
  "logicalOrganizations": ["POWER_DEPENDENCE", "FACTORISATION", "SYMMETRY"],
  "domains": ["ALGEBRA"],
  "symmetryStatus": "structurally_symmetric",
  "freeVariables": ["a", "b"],
  "boundVariables": [],
  "constraints": [],
  "validationErrors": []
}
```
- **Why this classification:** Power over a sum (`(a+b)^2`) triggers `POWER_DEPENDENCE` and `FACTORISATION`, while variable swap `(a, b) <-> (b, a)` yields `structurally_symmetric`.
- **Constraints & Uncertainties:** None; `NORMALIZED AST` unwraps outer group boundaries inside `^`.

---

### `CAT-02` — Linear Affine Expression
- **Formula:** `2x + 3y - 5` (context: `{}`)
- **Description:** Two-variable linear expression with implicit scalar multiplication.
- **Level A (Structural Constructs):** `{}`
- **Level B (Logical Organization):** `["DIFFERENCE"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["x", "y"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.247798",
  "structuralSchemaId": "UMFP.SCH.ALG.407F2D",
  "logicalClassId": "UMFP.LC.DIFFERENCE.5143",
  "structuralConstructs": {},
  "logicalOrganizations": ["DIFFERENCE"],
  "domains": ["ALGEBRA"],
  "symmetryStatus": "unknown",
  "freeVariables": ["x", "y"],
  "boundVariables": [],
  "constraints": [],
  "validationErrors": []
}
```
- **Why this classification:** Root binary node is `-` (`(2*x + 3*y) - 5`), assigning `DIFFERENCE` under `ALGEBRA`. Asymmetric coefficients (`2` vs `3`) leave `symmetryStatus: "unknown"`.
- **Constraints & Uncertainties:** No domain constraints or diagnostics.

---

### `CAT-03` — Algebraic Identity Equation
- **Formula:** `(a + b)^2 = a^2 + 2ab + b^2` (context: `{}`)
- **Description:** Classical binomial expansion identity.
- **Level A (Structural Constructs):** `{}`
- **Level B (Logical Organization):** `["EQUATION_RELATION", "POWER_DEPENDENCE", "FACTORISATION", "SYMMETRY"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.19BA7D",
  "structuralSchemaId": "UMFP.SCH.ALG.D6303A",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.FBA6",
  "structuralConstructs": {},
  "logicalOrganizations": ["EQUATION_RELATION", "POWER_DEPENDENCE", "FACTORISATION", "SYMMETRY"],
  "domains": ["ALGEBRA"],
  "symmetryStatus": "structurally_symmetric",
  "freeVariables": ["a", "b"],
  "boundVariables": [],
  "constraints": [],
  "validationErrors": []
}
```
- **Why this classification:** Root `=` sets `EQUATION_RELATION`; LHS `(a+b)^2` contributes `FACTORISATION` and `SYMMETRY`.
- **Constraints & Uncertainties:** UMFP records structural/logical metadata of the equation; verifying LHS $\equiv$ RHS symbolically across `=` requires a symbolic solver (deferred beyond `0.1.x`).

---

### `CAT-04` — Stacked Composite Fraction
- **Formula:** `\frac{a+b}{c-d}` (context: `{}`)
- **Description:** Stacked LaTeX fraction with compound numerator and denominator.
- **Level A (Structural Constructs):** `{ "FRACTION": 1 }` (`representation: "stacked"`)
- **Level B (Logical Organization):** `["RATIONAL_EXPRESSION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b", "c", "d"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.201EE3",
  "structuralSchemaId": "UMFP.SCH.ALG.03CB4C",
  "logicalClassId": "UMFP.LC.RATIONAL_EXPRESSION.3C28",
  "structuralConstructs": { "FRACTION": 1 },
  "logicalOrganizations": ["RATIONAL_EXPRESSION"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["a", "b", "c", "d"],
  "constraints": [
    {
      "kind": "nonzero_denominator",
      "expression": "c-d != 0",
      "sourceConstruct": "FRACTION",
      "status": "required"
    }
  ],
  "validationErrors": []
}
```
- **Why this classification:** `\frac{...}{...}` maps directly to `FRACTION`, emitting a `nonzero_denominator` constraint (`c-d != 0`) and classifying the purely algebraic ratio as `RATIONAL_EXPRESSION`.
- **Constraints & Uncertainties:** Valid only when $c - d \neq 0$.

---

### `CAT-05` — Atomic Inline Division
- **Formula:** `a/b` (context: `{}`)
- **Description:** Atomic binary division, intentionally distinguished from composite `FRACTION`.
- **Level A (Structural Constructs):** `{}` (`binary` with operator `'/'`, `FRACTION: 0`)
- **Level B (Logical Organization):** `["RATIONAL_EXPRESSION", "QUOTIENT"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.9E28B2",
  "structuralSchemaId": "UMFP.SCH.ALG.57F6CA",
  "logicalClassId": "UMFP.LC.RATIONAL_EXPRESSION.6B4F",
  "structuralConstructs": {},
  "logicalOrganizations": ["RATIONAL_EXPRESSION", "QUOTIENT"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["a", "b"],
  "constraints": [
    {
      "kind": "nonzero_denominator",
      "expression": "b != 0",
      "sourceConstruct": "BINARY_DIV",
      "status": "required"
    }
  ],
  "validationErrors": []
}
```
- **Why this classification:** Atomic `a/b` avoids promoting simple inline division to a stacked/grouped `FRACTION` construct while still enforcing `b != 0` (`BINARY_DIV`) and `QUOTIENT` / `RATIONAL_EXPRESSION`.
- **Constraints & Uncertainties:** Valid only when $b \neq 0$.

---

### `CAT-06` — Multi-Fraction Rational Equation
- **Formula:** `\frac{1}{x} + \frac{1}{y} = \frac{1}{z}` (context: `{}`)
- **Description:** Harmonic / reciprocal sum equation with three independent fractions.
- **Level A (Structural Constructs):** `{ "FRACTION": 3 }`
- **Level B (Logical Organization):** `["EQUATION_RELATION", "RATIONAL_EXPRESSION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["x", "y", "z"]`, `boundVariables: []`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.F3E3D0",
  "structuralSchemaId": "UMFP.SCH.ALG.0E3ED5",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.5089",
  "structuralConstructs": { "FRACTION": 3 },
  "logicalOrganizations": ["EQUATION_RELATION", "RATIONAL_EXPRESSION"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["x", "y", "z"],
  "constraints": [
    { "kind": "nonzero_denominator", "expression": "x != 0", "sourceConstruct": "FRACTION", "status": "required" },
    { "kind": "nonzero_denominator", "expression": "y != 0", "sourceConstruct": "FRACTION", "status": "required" },
    { "kind": "nonzero_denominator", "expression": "z != 0", "sourceConstruct": "FRACTION", "status": "required" }
  ],
  "validationErrors": []
}
```
- **Why this classification:** Each `\frac` contributes to `FRACTION: 3` and generates its own independent denominator constraint.
- **Constraints & Uncertainties:** Requires $x \neq 0$, $y \neq 0$, $z \neq 0$; UMFP does not solve the equation.

---

### `CAT-07` — Implicit Square Root in `REAL`
- **Formula:** `\sqrt{x}` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Even-degree radical with implicit index 2 in the real domain.
- **Level A (Structural Constructs):** `{ "RADICAL": 1 }` (`rawAst` omits `slots.index`; `normalizedAst` inserts `2`, `parity: "even"`)
- **Level B (Logical Organization):** `["RADICAL_DEPENDENCE"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["x"]`, `requested: REAL`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.942AEC",
  "structuralSchemaId": "UMFP.SCH.ALG.18B871",
  "logicalClassId": "UMFP.LC.RADICAL_DEPENDENCE.1553",
  "structuralConstructs": { "RADICAL": 1 },
  "logicalOrganizations": ["RADICAL_DEPENDENCE"],
  "domains": ["ALGEBRA"],
  "requestedNumberDomain": "REAL",
  "requiredNumberDomain": "REAL",
  "effectiveNumberDomain": "REAL",
  "freeVariables": ["x"],
  "constraints": [
    { "kind": "radicand_domain", "expression": "x >= 0", "sourceConstruct": "RADICAL", "status": "domain_dependent" }
  ],
  "validationErrors": []
}
```
- **Why this classification:** Even-degree radical in `REAL` requires `x >= 0` (`domain_dependent`).
- **Constraints & Uncertainties:** Domain constraint depends on `x >= 0` in `REAL`.

---

### `CAT-08` — Odd-Degree Radical
- **Formula:** `\sqrt[3]{a+b}` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Cube root of a sum in the real domain.
- **Level A (Structural Constructs):** `{ "RADICAL": 1 }` (`degree: 3`, `indexSource: "explicit"`, `parity: "odd"`)
- **Level B (Logical Organization):** `["RADICAL_DEPENDENCE", "SYMMETRY"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `requested: REAL`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.1D5A8F",
  "structuralSchemaId": "UMFP.SCH.ALG.98F398",
  "logicalClassId": "UMFP.LC.RADICAL_DEPENDENCE.00FE",
  "structuralConstructs": { "RADICAL": 1 },
  "logicalOrganizations": ["RADICAL_DEPENDENCE", "SYMMETRY"],
  "domains": ["ALGEBRA"],
  "symmetryStatus": "structurally_symmetric",
  "freeVariables": ["a", "b"],
  "constraints": [],
  "validationErrors": []
}
```
- **Why this classification:** Odd positive integer degree (`3`) is defined for all real radicands, so no `>= 0` constraint is emitted; `a + b` is symmetric in `a, b`.
- **Constraints & Uncertainties:** None in `REAL`.

---

### `CAT-09` — Symbolic-Index Radical
- **Formula:** `\sqrt[n]{x}` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Radical whose degree is a symbolic parameter `n`.
- **Level A (Structural Constructs):** `{ "RADICAL": 1 }` (`degree: null`, `indexSource: "symbolic"`, `parity: "unknown"`)
- **Level B (Logical Organization):** `["RADICAL_DEPENDENCE"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["n", "x"]`, `requested: REAL`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.460F9D",
  "structuralSchemaId": "UMFP.SCH.ALG.655ACF",
  "logicalClassId": "UMFP.LC.RADICAL_DEPENDENCE.1553",
  "structuralConstructs": { "RADICAL": 1 },
  "logicalOrganizations": ["RADICAL_DEPENDENCE"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["n", "x"],
  "constraints": [
    {
      "kind": "domain_unknown",
      "expression": "x (index \"n\" parity unknown)",
      "sourceConstruct": "RADICAL",
      "status": "unknown",
      "reason": "RADICAL_INDEX_PARITY_UNKNOWN"
    }
  ],
  "validationErrors": []
}
```
- **Why this classification:** Because the parity and positivity of `n` are unknown, UMFP refuses to falsely enforce `x >= 0` and records `RADICAL_INDEX_PARITY_UNKNOWN`.
- **Constraints & Uncertainties:** Agent should ask or infer whether `n` is a positive even or odd integer.

---

### `CAT-10` — Even Root of Negative Constant in `REAL`
- **Formula:** `\sqrt{-1}` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Demonstrates domain invalidity without silently switching the user's requested domain to `COMPLEX`.
- **Level A (Structural Constructs):** `{ "RADICAL": 1 }`
- **Level B (Logical Organization):** `["RADICAL_DEPENDENCE"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: []`, `requested: REAL`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "requestedNumberDomain": "REAL",
  "requiredNumberDomain": "REAL",
  "effectiveNumberDomain": "REAL",
  "structuralId": "UMFP.STR.ALG.B297A7",
  "logicalClassId": "UMFP.LC.RADICAL_DEPENDENCE.1553",
  "structuralConstructs": { "RADICAL": 1 },
  "logicalOrganizations": ["RADICAL_DEPENDENCE"],
  "domains": ["ALGEBRA"],
  "constraints": [
    {
      "kind": "radicand_domain",
      "expression": "-1 >= 0",
      "sourceConstruct": "RADICAL",
      "status": "invalid",
      "reason": "NEGATIVE_EVEN_RADICAND_IN_REAL"
    }
  ],
  "validationErrors": ["INVALID_DOMAIN"],
  "diagnostics": [{ "level": "error", "code": "INVALID_DOMAIN" }]
}
```
- **Why this classification:** The user requested `REAL`; `-1 < 0` under an even root violates real-domain validity (`INVALID_DOMAIN`) rather than silently mutating `requestedNumberDomain`.
- **Constraints & Uncertainties:** Expression is invalid in `REAL`; an agent can re-query with `{ numberDomain: 'COMPLEX' }` if complex branches are intended.

---

### `CAT-11` — Ambiguous Absolute Value / Norm
- **Formula:** `|a - b|` (context: `{}`)
- **Description:** Vertical-bar construct whose semantic meaning (scalar absolute value vs norm vs cardinality) depends on context.
- **Level A (Structural Constructs):** `{ "ABSOLUTE_VALUE": 1 }`
- **Level B (Logical Organization):** `["UNKNOWN"]` *(not forced into an algebraic identity)*
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.5C58A3",
  "structuralSchemaId": "UMFP.SCH.ALG.B1B671",
  "logicalClassId": "UMFP.LC.UNKNOWN.69B8",
  "structuralConstructs": { "ABSOLUTE_VALUE": 1 },
  "logicalOrganizations": ["UNKNOWN"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["a", "b"],
  "constraints": [],
  "validationErrors": [],
  "diagnostics": [{ "level": "info", "code": "AMBIGUOUS_BAR_CONSTRUCT" }]
}
```
- **Why this classification:** Structure is recognized (`ABSOLUTE_VALUE`), while Level B stays `UNKNOWN` because `|...|` without surrounding context is semantically ambiguous.
- **Constraints & Uncertainties:** `AMBIGUOUS_BAR_CONSTRUCT` signals that `a, b` could be scalars, vectors, or complex numbers.

---

### `CAT-12` — 2x2 Matrix (`Level C = UNKNOWN`)
- **Formula:** `[[a,b],[c,d]]` (context: `{}`)
- **Description:** Linear 2x2 matrix demonstrating full Level A/B recognition with Level C kept `UNKNOWN`.
- **Level A (Structural Constructs):** `{ "MATRIX": 1 }` (`metadata: { rows: 2, cols: 2, dimension: "2x2" }`)
- **Level B (Logical Organization):** `["MATRIX_TRANSFORMATION"]`
- **Level C (Mathematical Domain):** `UNKNOWN` (`unknown`, `medium` — linear algebra outside scalar `ALGEBRA`/`GEOMETRY` scope of `0.1.x`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b", "c", "d"]`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.UNK.57DA4D",
  "structuralSchemaId": "UMFP.SCH.UNK.F919EE",
  "logicalClassId": "UMFP.LC.MATRIX_TRANSFORMATION.00CC",
  "structuralConstructs": { "MATRIX": 1 },
  "logicalOrganizations": ["MATRIX_TRANSFORMATION"],
  "domains": ["UNKNOWN"],
  "domainClassification": {
    "primaryDomain": "UNKNOWN",
    "confidence": "medium",
    "classificationMethod": "unknown",
    "reasons": ["Construct belongs to calculus or linear algebra, which is restricted to UNKNOWN in UMFP 0.1.x domain scope."]
  },
  "freeVariables": ["a", "b", "c", "d"],
  "validationErrors": []
}
```
- **Why this classification:** Structural construct and dimensions are known, while the `0.1.x` domain boundary intentionally avoids inventing a `LINEAR_ALGEBRA` domain.
- **Constraints & Uncertainties:** `UNKNOWN` domain is expected; equivalence sampling is not applicable to matrices.

---

### `CAT-13` — Symbolic Determinant (`Level C = UNKNOWN`)
- **Formula:** `det(A)` (context: `{}`)
- **Description:** Determinant over an un-dimensioned symbolic matrix `A`.
- **Level A (Structural Constructs):** `{ "DETERMINANT": 1 }` (`squarenessVerified: false`)
- **Level B (Logical Organization):** `["DETERMINANT_STRUCTURE"]`
- **Level C (Mathematical Domain):** `UNKNOWN` (`unknown`, `medium`)
- **Variables & Domain Provenance:** `freeVariables: ["A"]`, `requested: UNSPECIFIED`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.UNK.82A6FB",
  "structuralSchemaId": "UMFP.SCH.UNK.7A023C",
  "logicalClassId": "UMFP.LC.DETERMINANT_STRUCTURE.608C",
  "structuralConstructs": { "DETERMINANT": 1 },
  "logicalOrganizations": ["DETERMINANT_STRUCTURE"],
  "domains": ["UNKNOWN"],
  "freeVariables": ["A"],
  "validationErrors": [],
  "diagnostics": [{ "level": "info", "code": "MATRIX_SQUARENESS_UNVERIFIED" }]
}
```
- **Why this classification:** Determinant requires a square matrix; since `A` is symbolic without dimension metadata, UMFP records `MATRIX_SQUARENESS_UNVERIFIED`.
- **Constraints & Uncertainties:** Agent should verify that $A \in K^{n \times n}$ in surrounding document context.

---

### `CAT-14` — Indexed Sum with Bound vs. Free Variables (Q2)
- **Formula:** `sum(i=1..n, i)` (context: `{}`)
- **Description:** Scalar indexed sum showing Q2 separation of bound index `i` from free upper bound `n`.
- **Level A (Structural Constructs):** `{ "INDEXED_SUM": 1 }`
- **Level B (Logical Organization):** `["INDEXED_AGGREGATION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["n"]`, `boundVariables: ["i"]`, `variables: ["i", "n"]` (compatible union).
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.46AF2B",
  "structuralSchemaId": "UMFP.SCH.ALG.503C56",
  "logicalClassId": "UMFP.LC.INDEXED_AGGREGATION.434C",
  "structuralConstructs": { "INDEXED_SUM": 1 },
  "logicalOrganizations": ["INDEXED_AGGREGATION"],
  "domains": ["ALGEBRA"],
  "constants": [],
  "freeVariables": ["n"],
  "boundVariables": ["i"],
  "variableScopes": [
    {
      "construct": "INDEXED_SUM",
      "boundVariable": "i",
      "scopeSlot": "body",
      "depth": 1,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": false
    }
  ],
  "validationErrors": []
}
```
- **Why this classification:** Bound index `i` is neither classified as `MATH_CONST_I` nor leaked into `freeVariables`; only `n` is a free parameter.
- **Constraints & Uncertainties:** Symbolic aggregation equivalence is not evaluated numerically in `0.1.x`.

---

### `CAT-15` — Nested Sum with Variable Shadowing & Scope Restoration (Q2)
- **Formula:** `sum(i=1..n, sum(i=1..m, i) + i)` (context: `{}`)
- **Description:** Double sum reusing the same dummy variable `i`, testing lexical shadowing and outer-scope restoration.
- **Level A (Structural Constructs):** `{ "INDEXED_SUM": 2 }` (`maximumCompositionDepth: 2`)
- **Level B (Logical Organization):** `["INDEXED_AGGREGATION", "COMPOSITION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["m", "n"]`, `boundVariables: ["i"]`, `variables: ["i", "m", "n"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.494090",
  "structuralSchemaId": "UMFP.SCH.ALG.AC01D0",
  "logicalClassId": "UMFP.LC.INDEXED_AGGREGATION.1E98",
  "structuralConstructs": { "INDEXED_SUM": 2 },
  "logicalOrganizations": ["INDEXED_AGGREGATION", "COMPOSITION"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["m", "n"],
  "boundVariables": ["i"],
  "variableScopes": [
    {
      "construct": "INDEXED_SUM",
      "boundVariable": "i",
      "scopeSlot": "body",
      "depth": 1,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": false
    },
    {
      "construct": "INDEXED_SUM",
      "boundVariable": "i",
      "scopeSlot": "body",
      "depth": 2,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": true
    }
  ]
}
```
- **Why this classification:** Nested `INDEXED_SUM` triggers `COMPOSITION`; inner `i` shadows outer `i` (`shadowsOuter: true`, 1 occurrence), and after exiting the inner sum the trailing `+ i` restores and binds to outer `depth: 1` (`boundOccurrenceCount: 1`).
- **Constraints & Uncertainties:** Demonstrates accurate lexical scoping without AST mutation.

---

### `CAT-16` — Indexed Product
- **Formula:** `prod(k=1..n, k * x)` (context: `{}`)
- **Description:** Indexed product with bound index `k` and free parameters `n`, `x`.
- **Level A (Structural Constructs):** `{ "INDEXED_PRODUCT": 1 }`
- **Level B (Logical Organization):** `["INDEXED_AGGREGATION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["n", "x"]`, `boundVariables: ["k"]`, `variables: ["k", "n", "x"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.F4EBC9",
  "structuralSchemaId": "UMFP.SCH.ALG.9B2589",
  "logicalClassId": "UMFP.LC.INDEXED_AGGREGATION.434C",
  "structuralConstructs": { "INDEXED_PRODUCT": 1 },
  "logicalOrganizations": ["INDEXED_AGGREGATION"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["n", "x"],
  "boundVariables": ["k"],
  "variableScopes": [
    {
      "construct": "INDEXED_PRODUCT",
      "boundVariable": "k",
      "scopeSlot": "body",
      "depth": 1,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": false
    }
  ]
}
```
- **Why this classification:** Mirrors `INDEXED_SUM` lexical binding for product aggregation (`k` bound in body, `n` and `x` free).
- **Constraints & Uncertainties:** Symbolic equivalence deferred to `0.2+`.

---

### `CAT-17` — Definite Integral (`Level C = UNKNOWN`)
- **Formula:** `int(a,b,f(x),x)` (context: `{}`)
- **Description:** Definite integral over `[a, b]` with dummy variable `x` and undeclared function `f`.
- **Level A (Structural Constructs):** `{ "INTEGRAL": 1 }`
- **Level B (Logical Organization):** `["INTEGRAL_TRANSFORMATION"]`
- **Level C (Mathematical Domain):** `UNKNOWN` (`unknown`, `medium` — calculus restricted to `UNKNOWN` in `0.1.x`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "b"]`, `boundVariables: ["x"]`, `variables: ["a", "b", "x"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.UNK.47457D",
  "structuralSchemaId": "UMFP.SCH.UNK.66C134",
  "logicalClassId": "UMFP.LC.INTEGRAL_TRANSFORMATION.E59B",
  "structuralConstructs": { "INTEGRAL": 1 },
  "logicalOrganizations": ["INTEGRAL_TRANSFORMATION"],
  "domains": ["UNKNOWN"],
  "freeVariables": ["a", "b"],
  "boundVariables": ["x"],
  "variableScopes": [
    {
      "construct": "INTEGRAL",
      "boundVariable": "x",
      "scopeSlot": "integrand",
      "depth": 1,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": false
    }
  ],
  "diagnostics": [{ "level": "info", "code": "AMBIGUOUS_FUNCTION_OR_MULTIPLICATION" }]
}
```
- **Why this classification:** UMFP captures `INTEGRAL`, `INTEGRAL_TRANSFORMATION`, bound `x` inside `integrand`, and free bounds `a, b`, while preserving `UNKNOWN` for calculus and flagging `f(...)` unless passed in `declaredFunctions`.
- **Constraints & Uncertainties:** Agent should pass `declaredFunctions: ['f']` if `f` is confirmed to be a function, and consult a calculus tool if evaluation is needed.

---

### `CAT-18` — Limit Process (`Level C = UNKNOWN`)
- **Formula:** `lim(x->a, f(x))` (context: `{}`)
- **Description:** Limit as `x` approaches `a`.
- **Level A (Structural Constructs):** `{ "LIMIT": 1 }`
- **Level B (Logical Organization):** `["LIMIT_PROCESS"]`
- **Level C (Mathematical Domain):** `UNKNOWN` (`unknown`, `medium`)
- **Variables & Domain Provenance:** `freeVariables: ["a"]`, `boundVariables: ["x"]`, `variables: ["a", "x"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.UNK.AF458D",
  "structuralSchemaId": "UMFP.SCH.UNK.F51D03",
  "logicalClassId": "UMFP.LC.LIMIT_PROCESS.23DD",
  "structuralConstructs": { "LIMIT": 1 },
  "logicalOrganizations": ["LIMIT_PROCESS"],
  "domains": ["UNKNOWN"],
  "freeVariables": ["a"],
  "boundVariables": ["x"],
  "variableScopes": [
    {
      "construct": "LIMIT",
      "boundVariable": "x",
      "scopeSlot": "body",
      "depth": 1,
      "boundOccurrenceCount": 1,
      "unusedBinder": false,
      "shadowsOuter": false
    }
  ],
  "diagnostics": [{ "level": "info", "code": "AMBIGUOUS_FUNCTION_OR_MULTIPLICATION" }]
}
```
- **Why this classification:** `x` is bound strictly in `body`, leaving the approach target `a` as a free parameter; calculus stays `UNKNOWN`.
- **Constraints & Uncertainties:** Existence of the limit is not analyzed by `0.1.x`.

---

### `CAT-19` — System of Equations
- **Formula:** `{x+y=5, x-y=1}` (context: `{}`)
- **Description:** Two-equation linear system wrapped in brace syntax.
- **Level A (Structural Constructs):** `{ "EQUATION_SYSTEM": 1 }`
- **Level B (Logical Organization):** `["EQUATION_RELATION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["x", "y"]`, `boundVariables: []`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.162E99",
  "structuralSchemaId": "UMFP.SCH.ALG.41E1BF",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.24C0",
  "structuralConstructs": { "EQUATION_SYSTEM": 1 },
  "logicalOrganizations": ["EQUATION_RELATION"],
  "domains": ["ALGEBRA"],
  "freeVariables": ["x", "y"],
  "constraints": [],
  "validationErrors": []
}
```
- **Why this classification:** Brace list of equations maps to `EQUATION_SYSTEM` in `ALGEBRA`.
- **Constraints & Uncertainties:** UMFP classifies the system structure; solving `(x, y) = (3, 2)` is out of scope for `0.1.x`.

---

### `CAT-20` — Geometric Formula (`Circle Area`)
- **Formula:** `S = πr^2` (context: `{}`)
- **Description:** Recognized geometric relation linking constant $\pi$ with variables `S` and `r`.
- **Level A (Structural Constructs):** `{}` (`MATH_CONST_PI` recognized)
- **Level B (Logical Organization):** `["EQUATION_RELATION", "POWER_DEPENDENCE"]`
- **Level C (Mathematical Domain):** `GEOMETRY` (`known_identity`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["S", "r"]`, `constants: ["MATH_CONST_PI"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.GEO.9CEC11",
  "structuralSchemaId": "UMFP.SCH.GEO.36A454",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.22F9",
  "structuralConstructs": {},
  "logicalOrganizations": ["EQUATION_RELATION", "POWER_DEPENDENCE"],
  "domains": ["GEOMETRY"],
  "domainClassification": {
    "primaryDomain": "GEOMETRY",
    "confidence": "high",
    "classificationMethod": "known_identity",
    "reasons": ["Recognized geometric circle area relation (pi * r^2)."]
  },
  "constants": [{ "constantId": "MATH_CONST_PI", "symbol": "π", "kind": "TRANSCENDENTAL", "numberDomain": "REAL", "occurrences": 1 }],
  "freeVariables": ["S", "r"]
}
```
- **Why this classification:** Matched explicitly by the `known_identity` rule (`S = πr^2` or `A = πr^2`), not solely because `π` appears.
- **Constraints & Uncertainties:** Geometric positivity ($r > 0$) is an external domain interpretation not imposed automatically unless modeled in caller logic.

---

### `CAT-21` — Geometric Invariant (`Euler Polyhedron Formula`)
- **Formula:** `V - E + F = 2` (context: `{}`)
- **Description:** Topological polyhedron invariant recognized as `GEOMETRY` without any special constructs or `π`.
- **Level A (Structural Constructs):** `{}`
- **Level B (Logical Organization):** `["EQUATION_RELATION", "INVARIANT"]`
- **Level C (Mathematical Domain):** `GEOMETRY` (`known_identity`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["E", "F", "V"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.GEO.FDCF11",
  "structuralSchemaId": "UMFP.SCH.GEO.C00C6A",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.22D0",
  "structuralConstructs": {},
  "logicalOrganizations": ["EQUATION_RELATION", "INVARIANT"],
  "domains": ["GEOMETRY"],
  "domainClassification": {
    "primaryDomain": "GEOMETRY",
    "confidence": "high",
    "classificationMethod": "known_identity",
    "reasons": ["Recognized Euler polyhedron invariant V - E + F = 2."]
  },
  "freeVariables": ["E", "F", "V"]
}
```
- **Why this classification:** Relation equals constant `2` with >= 2 LHS variables triggers `INVARIANT`, and `(V, E, F)` with constant `2` triggers the Euler polyhedron `known_identity`.
- **Constraints & Uncertainties:** Assumes convex polyhedra; if `V, E, F` meant non-geometric symbols in another field, caller could override via `domainHint`.

---

### `CAT-22` — `π` Without Geometric Context (`ALGEBRA`, Not `GEOMETRY`)
- **Formula:** `π + x` (context: `{}`)
- **Description:** Demonstrates that `π` alone never forces a formula into `GEOMETRY`.
- **Level A (Structural Constructs):** `{}` (`MATH_CONST_PI` recognized)
- **Level B (Logical Organization):** `["SUMMATION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["x"]`, `constants: ["MATH_CONST_PI"]`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "structuralId": "UMFP.STR.ALG.5B8631",
  "structuralSchemaId": "UMFP.SCH.ALG.2CFAB2",
  "logicalClassId": "UMFP.LC.SUMMATION.DC43",
  "structuralConstructs": {},
  "logicalOrganizations": ["SUMMATION"],
  "domains": ["ALGEBRA"],
  "constants": [{ "constantId": "MATH_CONST_PI", "symbol": "π", "kind": "TRANSCENDENTAL", "numberDomain": "REAL", "occurrences": 1 }],
  "freeVariables": ["x"]
}
```
- **Why this classification:** No known geometric relation is present; `π + x` is simply an algebraic sum involving a transcendental constant.
- **Constraints & Uncertainties:** None.

---

### `CAT-23` — Number Domain Conflict Provenance (Q3)
- **Formula:** `i^2 = -1` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Imaginary unit identity evaluated under an explicit `REAL` caller request.
- **Level A (Structural Constructs):** `{}` (`MATH_CONST_I` recognized by defining equation)
- **Level B (Logical Organization):** `["EQUATION_RELATION", "POWER_DEPENDENCE"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: []`, `requested: REAL`, `required: COMPLEX`, `effective: COMPLEX`, `numberDomain: COMPLEX` (compatible alias).
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "requestedNumberDomain": "REAL",
  "requiredNumberDomain": "COMPLEX",
  "effectiveNumberDomain": "COMPLEX",
  "numberDomain": "COMPLEX",
  "structuralId": "UMFP.STR.ALG.982126",
  "logicalClassId": "UMFP.LC.EQUATION_RELATION.22F9",
  "domains": ["ALGEBRA"],
  "constants": [{ "constantId": "MATH_CONST_I", "symbol": "i", "kind": "IMAGINARY_UNIT", "numberDomain": "COMPLEX", "occurrences": 1 }],
  "freeVariables": [],
  "diagnostics": [
    {
      "level": "warning",
      "code": "NUMBER_DOMAIN_CONFLICT",
      "message": "Expression contains COMPLEX constant(s) (e.g. MATH_CONST_I) while requested numberDomain is REAL; effective numberDomain promoted to COMPLEX."
    }
  ]
}
```
- **Why this classification:** Q3 preserves `requestedNumberDomain: "REAL"` instead of erasing user intent, while promoting `effectiveNumberDomain` to `"COMPLEX"` and emitting `NUMBER_DOMAIN_CONFLICT`.
- **Constraints & Uncertainties:** Numeric real sampling is blocked in `equivalence.ts`.

---

### `CAT-24` — Conservative Disambiguation of `i` in `REAL`
- **Formula:** `a + i` (context: `{ "numberDomain": "REAL" }`)
- **Description:** Ambiguous lowercase `i` in a `REAL` scalar context without imaginary-unit declaration.
- **Level A (Structural Constructs):** `{}` (`constants: []`)
- **Level B (Logical Organization):** `["SYMMETRY", "SUMMATION"]`
- **Level C (Mathematical Domain):** `ALGEBRA` (`structural_rules`, `high`)
- **Variables & Domain Provenance:** `freeVariables: ["a", "i"]`, `requested: REAL`, `required: REAL`, `effective: REAL`.
- **Actual UMFP Passport Excerpt:**
```json
{
  "parseStatus": "parsed",
  "requestedNumberDomain": "REAL",
  "requiredNumberDomain": "REAL",
  "effectiveNumberDomain": "REAL",
  "structuralId": "UMFP.STR.ALG.CA3D9B",
  "structuralSchemaId": "UMFP.SCH.ALG.3FEBD8",
  "logicalClassId": "UMFP.LC.SYMMETRY.A4D5",
  "logicalOrganizations": ["SYMMETRY", "SUMMATION"],
  "domains": ["ALGEBRA"],
  "constants": [],
  "freeVariables": ["a", "i"],
  "diagnostics": [
    {
      "level": "info",
      "code": "AMBIGUOUS_CONSTANT_OR_VARIABLE",
      "message": "Lowercase \"i\" without COMPLEX numberDomain or explicit imaginary-unit context is ambiguous between imaginary unit (MATH_CONST_I) and a variable; treated conservatively as variable."
    }
  ]
}
```
- **Why this classification:** Without `COMPLEX` or `declaredConstants: ['i']`, UMFP refuses to silently promote `i` to `MATH_CONST_I`, keeping `a + i` in `REAL` and surfacing `AMBIGUOUS_CONSTANT_OR_VARIABLE`.
- **Constraints & Uncertainties:** Agent should check whether surrounding context defines `i` as $\sqrt{-1}$, an index, or a free variable.
