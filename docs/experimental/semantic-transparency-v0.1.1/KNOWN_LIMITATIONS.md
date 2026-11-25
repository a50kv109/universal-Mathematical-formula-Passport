# Known Limitations — UMFP Semantic Transparency Extension (`0.1.1-semantic-ext`)

This document explicitly records the current technical, architectural, and empirical limitations of `0.1.1-semantic-ext`. Nothing listed below is claimed as implemented.

---

## 1. No Automatic Extraction from PDFs or Unstructured Text

- The extension does **not** parse PDF files, LaTeX document bodies, tables, or natural-language prose.
- All semantic metadata (`SemanticContext`) must be constructed externally (by a human researcher, an upstream parser, or an AI extraction pipeline) and passed explicitly to `generateTransparentPassport(...)` or `buildSemanticTransparencyReport(...)`.

## 2. Dependence on `UMFP Core` Tokenization & Parser Coverage

- Because `src/umfp-core/` is intentionally frozen on this branch, symbol discovery (`freeVariables`, `boundVariables`, `constants`) relies strictly on what `umfp-core` parses.
- Unsupported LaTeX commands (such as `\kappa`, `\nabla`, `\partial`, `\mathcal{L}`, vector/tensor accents) may be parsed as `kind: 'unknown'` AST nodes or split unexpectedly.
- While `UNSUPPORTED_LATEX_SYMBOL_MISMATCH` now catches `\\...` keys supplied in `SemanticContext.symbols` that `umfp-core` did not tokenize as variables, the extension **cannot** parse or bind those symbols itself without core parser support.

## 3. No Automatic Dimensional or Unit Verification

- The `units` field on `SemanticSymbolInput` and `SemanticSymbolEntry` (e.g., `'m'`, `'W/m^2'`, `'m^-2'`) is stored and forwarded purely as **descriptive string metadata**.
- The extension does **not** parse SI/imperial units, check dimensional homogeneity across equations (e.g., verifying that `S = p * r` yields `m^2 = m * m`), or validate unit consistency across `definingExpression` expansions.

## 4. No Machine-Checked or Independent Formal Proof Verification

- `proofEvidence` (`sourceClaimsProof`, `independentlyVerified`, `machineVerified`, `verificationSystem`, `note`) explicitly documents source claims only.
- In `0.1.1-semantic-ext`, `independentlyVerified` and `machineVerified` are **always `false`**, and `verificationSystem` is **always `null`**.
- There is no integration with Lean, Coq, Isabelle, Z3, or a Computer Algebra System (CAS).

## 5. Dependence on Quality and Completeness of Supplied `SemanticContext`

- Semantic accuracy depends entirely on the caller-provided `SemanticContext`.
- If a caller supplies an inaccurate `meaning`, omits a `definingExpression` on a composite variable, or passes wrong `conditions`, the extension cannot independently verify those claims against a paper.
- Similarly, if a caller labels an LLM guess as `'source_document'` instead of `'agent_inferred'`, the extension has no access to the original manuscript to catch the mislabeling.

## 6. No Guarantee of Correctness for External Extractors

- When an upstream LLM or extraction pipeline builds `SemanticContext`, `0.1.1-semantic-ext` can isolate `'agent_inferred'` entries via `AGENT_INFERRED_UNVERIFIED` diagnostics, **provided the extractor honestly marks its provenance/epistemic origin**.
- The extension does not audit external extractors for hallucinations, misread subscripts, or missed applicability constraints in surrounding paragraphs.

## 7. Unverified Field Behavior on Real Scientific Publications

- All `15/15` passing tests in `src/umfp-semantic/semantic-tests.ts` use controlled synthetic or textbook `SemanticContext` fixtures.
- A rigorous field evaluation on real multi-page scientific papers (without pre-authored `SemanticContext`) has **not yet been completed** and is a primary goal of [`INDEPENDENT_TESTING_PROTOCOL.md`](./INDEPENDENT_TESTING_PROTOCOL.md) (Area 12).

## 8. Bounded Recursion & Edge Cases Under Audit

- Recursive composite expansion is capped at `MAX_EXPANSION_DEPTH = 6` to prevent infinite recursion; deeper legitimate chains trigger `cycleDetected: true` and `EXPANSION_CYCLE_DETECTED`.
- Subtle edge cases intentionally left open for independent adversarial testing include: empty/whitespace `definingExpression` strings, shared diamond DAG dependencies, `agent_inferred` on `mathematicalBasis` vs individual symbols, and multi-equation / piecewise conditions.
