# Experimental Branch Passport — `experimental/semantic-transparency-v0.1.1`

> **Notice:** This is an independent experimental research branch for external auditing and reproducible testing. It is **not** merged into the main UMFP branch, is **not** an official UMFP release, and must **not** be automatically merged into `main`.

---

## 1. Branch & Extension Identification

| Field | Value |
| :--- | :--- |
| **Target Branch Name / ID** | `experimental/semantic-transparency-v0.1.1` *(recommended Git branch identifier for publishing this snapshot)* |
| **Extension Name** | UMFP Semantic Transparency Extension |
| **Extension Version** | `0.1.1-semantic-ext` |
| **Base Core Version** | UMFP Core `0.1.0` (`src/umfp-core/` — untouched) |
| **Package Identity** | `umfp@0.1.0` (`package.json`, Apache-2.0) |
| **Development Status** | Experimental / Under Independent External Audit (Pre-acceptance) |
| **Merge Policy** | **DO NOT AUTO-MERGE into `main`.** Any acceptance into the main UMFP contour requires separate evaluation and explicit maintainer approval after field testing. |

*Workspace note: The source snapshot from which these files were prepared does not contain `.git` repository metadata locally; when publishing to GitHub, create and push this work strictly on the dedicated branch `experimental/semantic-transparency-v0.1.1` rather than `main`.*

---

## 2. Purpose of the Experiment

This branch publishes `src/umfp-semantic/` (`0.1.1-semantic-ext`) alongside reproducible testing protocols so that independent AI systems (including Gemini, DeepSeek, Claude, and other external auditors) and human researchers can:

1. Inspect the architecture and verify strict separation from frozen `UMFP Core`.
2. Reproduce existing unit and corrective tests locally (`123/123` Core Golden Tests, `15/15` Semantic Extension Tests).
3. Attempt to break the extension with adversarial inputs, unsupported LaTeX tokens, nested composite definitions, ambiguous notations, and **real scientific papers without a pre-authored `SemanticContext`**.
4. Submit structured, reproducible defect reports and counterexamples using [`INDEPENDENT_REVIEW_TEMPLATE.md`](./INDEPENDENT_REVIEW_TEMPLATE.md).

---

## 3. Relationship to UMFP Core (`src/umfp-core/`)

- **Zero Core Modification:** Every file under `src/umfp-core/` (`ast.ts`, `constantRegistry.ts`, `equivalence.ts`, `golden-tests.ts`, `parser.ts`, `passport.ts`, `types.ts`) remains completely unchanged.
- **Preserved Contract:** `generateTransparentPassport(expr, parseCtx, semanticCtx).passport` calls `generatePassport(expr, parseCtx)` directly and returns a byte-identical `FormulaPassport`.
- **Decoupled Wrapper Layer:** All semantic transparency logic resides exclusively in `src/umfp-semantic/` (`types.ts`, `semanticTransparency.ts`, `semantic-tests.ts`). Core consumers are unaffected.

---

## 4. Summary of Changes vs Initial `0.1.0-semantic-ext`

Following an independent post-implementation audit of `0.1.0-semantic-ext`, the following localized corrective changes were implemented in `0.1.1-semantic-ext` (full details in [`CHANGELOG.md`](./CHANGELOG.md)):

1. **Recursive Materialization (`ST-C01`):** Discovered intermediate and leaf variables from `definingExpression` expansions are materialized into `symbolEntries` with `roleInFormula: 'expanded_dependency'`, preserving `meaning`, `units`, `conditions`, `provenance`, `epistemicOrigin`, and `sourceEvidence`.
2. **Semantic Completeness Guard (`ST-C02`):** Undocumented expanded leaf variables increment `undocumentedCount`, populate `missingInformation`, and block `transparencyStatus: 'complete'` (eliminating false completeness on formulas such as $S = p \cdot r$ when $a, b, c$ are omitted).
3. **Context Consistency & Unsupported LaTeX Diagnostics (`ST-C03`):** Unmatched keys in `SemanticContext.symbols` are never silently discarded or heuristically substituted; unsupported LaTeX commands in the source expression (such as `\kappa`) emit `UNSUPPORTED_LATEX_SYMBOL_MISMATCH` and block `'complete'`, while unused context keys emit `UNMATCHED_CONTEXT_SYMBOL`.
4. **Expansion & Root Parse Integrity (`ST-C04`):** Any `definingExpression` producing `parseStatus !== 'parsed'` (even with empty `validationErrors`) emits `EXPANSION_PARSE_FAILED` / `EXPANSION_PARSE_PARTIAL`, enters `missingInformation`, and blocks `'complete'`. Root `passport.parseStatus !== 'parsed'` also blocks `'complete'`.
5. **Epistemic Origin Separation (`epistemicOrigin`):** Separates where a claim comes from (`'source_document' | 'reference_knowledge' | 'agent_inferred' | 'unknown'`) from mathematical `provenance` (`'standard_model' | 'derived_from_quantities' | 'author_introduced' | 'experimental_fit' | 'unspecified'`). Legacy `SemanticContext` inputs omitting `epistemicOrigin` default strictly to `'unknown'`.
6. **Proof Evidence Clarity (`proofEvidence`):** Replaces ambiguous `isFormalProof: boolean` with `proofEvidence: { sourceClaimsProof, independentlyVerified, machineVerified, verificationSystem, note }`, explicitly separating source claims from independent/machine verification (`false` / `null`).
7. **Expanded Test Suite (`ST-C01`–`ST-C08`):** Added 8 corrective test cases (`15/15` local Semantic Extension tests total).

---

## 5. Known Limitations

All known boundaries and unresolved issues are documented candidly in [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md), including:

- No automatic extraction of `SemanticContext` from PDFs or unstructured prose.
- Dependence on `UMFP Core` tokenization for non-supported LaTeX constructs.
- No dimensional/unit consistency checking (`units` are stored as descriptive metadata only).
- No independent or machine-checked formal proof verification (Lean/Coq/Isabelle).
- No field audit yet on real multi-page scientific papers without a manually curated `SemanticContext`.

---

## 6. Navigation for External Reviewers

- Start here for onboarding: [`EXPERIMENTAL_README.md`](./EXPERIMENTAL_README.md)
- Execute structured checks: [`INDEPENDENT_TESTING_PROTOCOL.md`](./INDEPENDENT_TESTING_PROTOCOL.md)
- Review known boundaries: [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)
- Inspect evolution from `v0.1.0` to `v0.1.1`: [`CHANGELOG.md`](./CHANGELOG.md)
- Submit your audit report using: [`INDEPENDENT_REVIEW_TEMPLATE.md`](./INDEPENDENT_REVIEW_TEMPLATE.md)
