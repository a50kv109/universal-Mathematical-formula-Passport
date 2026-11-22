# Project Purpose and Philosophy (`UMFP 0.1.x`)

## 1. The Problem of Uncertainty in Automated Formula Handling

When an AI agent encounters a mathematical formula inside a scientific paper, engineering specification, textbook, or user message, it immediately faces structural and semantic uncertainty:

- Is `a/b` equivalent in role to a composite stacked fraction `\frac{a+b}{c-d}`?
- Is `i` the imaginary unit ($\sqrt{-1}$), a summation index, or a free variable?
- Does the presence of $\pi$ mean the formula is geometric, or is it purely algebraic or transcendental?
- Which variables are free parameters and which are dummy variables bound by $\sum$, $\prod$, $\int$, or $\lim$?
- What hidden domain conditions (nonzero denominators, even-root radicands, conflicting number domains) govern valid interpretation?

Without an explicit pre-analysis layer, language models and automated pipelines often **improvise confident answers**—guessing domains, hallucinating equivalences, or silently overriding user assumptions.

---

## 2. UMFP as an Intermediate Interpretation Layer

**UMFP (Universal Mathematical Formula Passport)** is designed as a **deterministic orientation and passportization layer** sitting between raw mathematical notation and downstream AI reasoning:

```text
Raw Mathematical Expression
          │
          ▼
   UMFP Deterministic Core (0.1.x)
          │
          ▼
     Formula Passport
   (Structure · Logic · Domain · Variables · Provenance · Constraints · Unknowns)
          │
          ▼
   AI Agent / External Tooling
   (Literature lookup · Context clarification · External CAS/Verification · Reasoning)
```

Rather than claiming to be a mathematical oracle, UMFP gives an AI agent a **structured anchor point**:
1. **What is in the notation?** Explicit structural constructs and AST representation.
2. **How is it organized?** Relational, compositional, aggregation, or functional organization.
3. **Where does it sit in the supported domain model?** `ALGEBRA`, `GEOMETRY`, or `UNKNOWN`.
4. **What is known about variables, constants, and number domains?** Lexical scope, constant identification, and domain provenance.
5. **Where does certainty stop?** Explicit validation errors, domain constraints, ambiguity warnings, and `UNKNOWN` classifications.

---

## 3. Classification vs. Mathematical Proof

A foundational rule of UMFP is that **structural classification, numerical checking, and mathematical proof are strictly distinct**:

- **Structural matching is not proof of identity** unless exact canonical normalized ASTs agree cleanly without validation errors (`proofMethod: 'canonical_ast_normalization'`). Hash IDs (`structuralId`, `structuralSchemaId`) are index keys, never proofs.
- **Numeric agreement is not algebraic proof.** Deterministic sampling (`numeric_sampling`) can refute non-equivalent real expressions with a counterexample or provide `numerically_supported` evidence, but never claims `proven`.
- **Unsupported complexity stays `unknown` or `not_applicable`.** Higher-order constructs (integrals, limits, matrices, determinants, indexed sums/products) and complex-domain branch semantics are never forced into fake numeric answers.

---

## 4. The Role of `UNKNOWN`

In UMFP, **`UNKNOWN` is a first-class, healthy output — not a system failure.**

- If a formula contains `MATRIX`, `DETERMINANT`, `INTEGRAL`, or `LIMIT`, UMFP `0.1.x` still extracts its structural constructs (`Level A`), logical organization (`Level B`), bound/free variables, and constraints — while honestly marking its domain as `UNKNOWN` (`Level C`).
- If an absolute value `|a - b|` cannot distinguish whether it represents scalar magnitude, vector norm, or set cardinality without context, UMFP records `AMBIGUOUS_BAR_CONSTRUCT` and leaves logical organization `UNKNOWN`.
- If a symbol like `e` or `i` appears ambiguously outside clear context, UMFP avoids silent conversion to `MATH_CONST_E` or `MATH_CONST_I` and records `AMBIGUOUS_CONSTANT_OR_VARIABLE`.

Preserving uncertainty enables downstream agents to **ask for clarification or consult external references**, instead of propagating a hidden hallucination.

---

## 5. Interaction with External Knowledge Sources *(Intended Integration Pattern)*

In a complete agent workflow, UMFP handles **local syntactic and structural grounding**, while external tools handle **semantic lookup and deep proving**:

1. An agent receives an unfamiliar expression (e.g., `det(A)` or `V - E + F = 2` or `\int_{0}^{x} t\,dt`).
2. UMFP produces the `FormulaPassport`.
3. The agent inspects:
   - whether parsing succeeded cleanly (`parseStatus`) and whether errors exist (`validationErrors`);
   - which constructs and variables exist (`features.structuralConstructs`, `features.freeVariables`, `features.boundVariables`);
   - whether the domain is resolved (`ALGEBRA` / `GEOMETRY`) or `UNKNOWN`;
   - whether `requestedNumberDomain` conflicts with `requiredNumberDomain`.
4. Using those structured facts, the agent can formulate targeted queries against textbooks, mathematical databases, or external verification tools, and return with verified domain context (e.g., passing `declaredVariables` or `domainHint` on a follow-up inspection).

*(Note: External search, literature APIs, and autonomous multi-step agents are outside the scope of the UMFP `0.1.x` codebase itself.)*

---

## 6. Boundaries of Responsibility

UMFP `0.1.x` explicitly refuses to become:
- a Computer Algebra System (CAS);
- a theorem prover or symbolic equation solver;
- an all-encompassing taxonomy of physics, statistics, or domain sciences;
- a semantic authority overriding deterministic evidence (when exploratory AI endpoints are enabled in `server.ts`, their outputs are always labeled `aiProposed: true, verificationStatus: "unverified"` and never overwrite core deterministic fields).

**A Formula Passport is never the final answer. It is the reliable starting point for further mathematical investigation.**
