# Independent Testing Protocol — UMFP Semantic Transparency Extension (`0.1.1-semantic-ext`)

This protocol guides independent AI agents and human reviewers through structured verification and adversarial testing of the `experimental/semantic-transparency-v0.1.1` branch.

**Core Principle:** Passing the bundled `15/15` unit tests is a *necessary* baseline, **not** sufficient proof of fitness. Reviewers are explicitly encouraged to construct **counterexamples, negative tests, edge-case inputs, and real-paper extraction scenarios** outside the existing test suite.

---

## Standard Defect Report Format

Whenever a scenario deviates from expected behavior, record the defect using the following structure (and include it in [`INDEPENDENT_REVIEW_TEMPLATE.md`](./INDEPENDENT_REVIEW_TEMPLATE.md)):

```markdown
- **Defect ID:** [e.g., EXT-001]
- **Protocol Area:** [1–12]
- **Severity:** [Critical | High | Medium | Low]
- **Input Expression & Context:** [Exact expression, ParseContext, SemanticContext]
- **Observed Output:** [Exact relevant fields / status / diagnostics]
- **Expected Behavior:** [What should have happened and why]
- **Reproducible Command:** [`npx tsx -e "..."` snippet]
```

---

## Protocol Areas (1–12)

### Area 1 — Semantic Resolution of Mathematical Notations
- **What is tested:** Mapping of constants (`ConstantRegistry`), bound variables (`Q2`), and free variables to `symbolEntries` with accurate `roleInFormula`, `resolutionStatus`, `meaning`, `units`, and `conditions`.
- **Test scenario:** Run formulas combining registered constants (`\pi`, `e`, `i`), bound summation/integral variables (`\sum_{i=1}^n a_i x`), and domain-specific free parameters (e.g., `S = \pi r^2`, custom multi-character symbols like `delta_T`).
- **Expected behavior:** Constants resolve automatically as `roleInFormula: 'constant'`, `resolutionStatus: 'well_known'`; bound indices resolve as `bound_variable`; documented free variables retain exact `meaning`, `units`, and `conditions`; undocumented variables become `undocumented` with `meaning: null`.
- **Pass criterion:** Zero hallucinated meanings for undocumented symbols and exact preservation of provided metadata across all `symbolEntries`.
- **Defect logging:** Record any misclassified role, dropped metadata field, or guessed meaning using the Standard Defect Report Format.

### Area 2 — Recursive Expansion of Composite Quantities
- **What is tested:** Single-level (`S = p * r` $\to$ `p = (a + b + c) / 2`) and multi-level (`A = p * r` $\to$ `p = P / 2` $\to$ `P = a + b + c`) expansion via `umfp-core`, plus cycle protection.
- **Test scenario:** Test 1-level, 3-level, diamond-DAG (`x = u + v`, `u = t + 1`, `v = t - 1`), and cyclic (`x = y + 1`, `y = x - 1`) definitions, as well as depth $> 6$ chains (`MAX_EXPANSION_DEPTH = 6`).
- **Expected behavior:** Intermediate composite symbols and leaf variables appear in `symbolEntries` as `expanded_dependency` (unless already top-level); `expandedLeafVariables` lists only true leaves; cycles or depth limits set `cycleDetected: true` and emit `EXPANSION_CYCLE_DETECTED`.
- **Pass criterion:** Accurate `expandedLeafVariables`, no infinite recursion, and non-lossy materialization of intermediate/leaf metadata. *(Check carefully how diamond DAGs behave when the same variable appears via two branches.)*
- **Defect logging:** Log missing intermediate/leaf entries, false cycle detections on valid DAGs, or incorrect `expandedLeafVariables`.

### Area 3 — Detection of Undocumented Dependencies
- **What is tested:** Enforcement of strict semantic completeness (`transparencyStatus`) when top-level or recursively expanded dependencies lack documentation.
- **Test scenario:** Provide full documentation for `S`, `p`, `r`, and `mathematicalBasis` in `S = p * r` (`p = (a + b + c) / 2`), while omitting `a`, `b`, `c` (or omitting only `b`, or providing `{ symbol: 'b' }` without `meaning`).
- **Expected behavior:** Omitted or meaningless leaves receive `resolutionStatus: 'undocumented'`, increment `undocumentedCount`, populate `missingInformation` (`target: 'symbol:...'`), and force `transparencyStatus !== 'complete'`.
- **Pass criterion:** `transparencyStatus: 'complete'` is **never** returned if any top-level or expanded symbol is undocumented.
- **Defect logging:** Any output returning `transparencyStatus: 'complete'` with missing/empty symbol definitions is a **Critical** defect.

### Area 4 — Epistemic Origin Tracking (`epistemicOrigin`)
- **What is tested:** Strict distinction between `'source_document'`, `'reference_knowledge'`, `'agent_inferred'`, and `'unknown'`, without mixing them with mathematical `provenance`.
- **Test scenario:** Supply mixed `epistemicOrigin` values in a single formula (e.g., `y` from `source_document`, `a` from `reference_knowledge`, `x` from `agent_inferred`, and `b` omitting `epistemicOrigin`), plus check `mathematicalBasis.epistemicOrigin`.
- **Expected behavior:** Input values are preserved verbatim without mutating `provenance`; omitted values become `'unknown'`; `'agent_inferred'` emits an `info` diagnostic `AGENT_INFERRED_UNVERIFIED` and populates `uncertaintyNote`; core constants and default bound variables use `'reference_knowledge'`.
- **Pass criterion:** No silent promotion of `'unknown'` or `'agent_inferred'` to `'source_document'`; note whether `'agent_inferred'` on `mathematicalBasis` or `bound_variable` also triggers appropriate notices (test this as a potential edge case!).
- **Defect logging:** Report any missing `epistemicOrigin`, cross-contamination with `provenance`, or silent upgrade of unverified claims.

### Area 5 — Mathematical Parameter Provenance (`provenance`)
- **What is tested:** Separation of `'standard_model'`, `'derived_from_quantities'`, `'author_introduced'`, `'experimental_fit'`, and `'unspecified'`.
- **Test scenario:** Test formulas mixing physical constants/standard quantities, author-defined coefficients (`k_eff` with `experimental_fit`), derived intermediates (`definingExpression` with `derived_from_quantities`), and undocumented symbols.
- **Expected behavior:** Explicit `provenance` is preserved; defaults follow `derived_from_quantities` (when `expansion` exists), `author_introduced` (when `kind === 'author_defined'`), `standard_model` (documented non-author), and `'unspecified'` (when undocumented).
- **Pass criterion:** `provenance` reflects mathematical nature independently of `epistemicOrigin` (e.g., an `'experimental_fit'` parameter can have `epistemicOrigin: 'source_document'`).
- **Defect logging:** Log cases where `provenance` overrides caller input or conflates derivation status with source attribution.

### Area 6 — Source Traceability (`sourceEvidence`)
- **What is tested:** Preservation of `{ section, formulaRef, tableOrPage, excerpt }` on top-level symbols, `expanded_dependency` entries, and `mathematicalBasis`.
- **Test scenario:** Attach distinct `sourceEvidence` objects to free variables, intermediate `expanded_dependency` symbols, leaf symbols, and `mathematicalBasis` (including `missing` basis edge cases).
- **Expected behavior:** Every provided `sourceEvidence` object is preserved intact in the corresponding output entry.
- **Pass criterion:** Zero truncation or loss of `sourceEvidence` across nesting levels.
- **Defect logging:** Record any dropped or overwritten `sourceEvidence` fields.

### Area 7 — Ambiguity and Conflict Detection
- **What is tested:** Handling of `kind: 'ambiguous'`, `wellKnownCandidateMeanings` with $\ge 2$ candidates, duplicate conflicting symbol entries for the same symbol in `SemanticContext.symbols`, and forwarded `umfp-core` `AMBIGUOUS_CONSTANT_OR_VARIABLE` diagnostics.
- **Test scenario:** Test (a) explicit `kind: 'ambiguous'`, (b) duplicate `SemanticContext.symbols` entries for `k` with different meanings, (c) a symbol with both `definingExpression` AND duplicate entries, and (d) `umfp-core` constant/variable ambiguity (e.g., `e` or `i` in `REAL` vs `COMPLEX` contexts).
- **Expected behavior:** Ambiguous entries receive `resolutionStatus: 'ambiguous'`, `meaning: null`, populated `candidates`, an entry in `ambiguities`, and block `transparencyStatus: 'complete'`.
- **Pass criterion:** The system never silently selects the first entry among conflicting meanings.
- **Defect logging:** Report any silent pick of a single meaning or missed `AMBIGUOUS_CONSTANT_OR_VARIABLE` forwarding.

### Area 8 — Unsupported LaTeX Notations
- **What is tested:** Behavior when `sourceExpression` contains LaTeX commands not supported by `umfp-core` (e.g., `\kappa`, `\alpha`, `\sigma`, `\mathcal{L}`, `\mathbf{x}`), while `SemanticContext` provides definitions for them.
- **Test scenario:** Test `F = \kappa * (v / L_0)` and additional adversarial LaTeX expressions such as `\alpha + \beta = \gamma`, `\frac{\partial u}{\partial t} = \nu \nabla^2 u`, or subscripted Greek `\theta_{0}`.
- **Expected behavior:** The extension must **not** crash, silently ignore the mismatch, or guess symbol mappings; when a `\\...` key in `SemanticContext` appears in `sourceExpression` but is absent from parsed tokens, it emits `UNSUPPORTED_LATEX_SYMBOL_MISMATCH`, records it in `missingInformation`, and blocks `transparencyStatus: 'complete'`.
- **Pass criterion:** Every undetected/untokenized LaTeX key supplied in `SemanticContext` is surfaced explicitly, and `'complete'` is blocked. *(Reviewers should specifically probe multi-letter tokens or non-backslash symbols that `umfp-core` splits or marks `unknown`!)*
- **Defect logging:** Record any LaTeX command that produces silent data loss or false `'complete'`.

### Area 9 — Malformed and Partially Parsed Definitions
- **What is tested:** Integrity checks when `definingExpression` (or the root expression) produces `parseStatus === 'partial'` or `'failed'`, or `validationErrors.length > 0`.
- **Test scenario:** Pass `definingExpression` values such as `'1 / ('`, `'???'`, `'   '` (whitespace), `''` (empty string), `'a + = b'`, or `'1 / 0'` (`validationErrors`). Also test a malformed root expression with full `SemanticContext`.
- **Expected behavior:** Any `parseStatus !== 'parsed'` emits `EXPANSION_PARSE_PARTIAL` or `EXPANSION_PARSE_FAILED`, adds an entry to `missingInformation`, and blocks `transparencyStatus: 'complete'`. *(Test empty string `''` and whitespace `'   '` as adversarial counterexamples!)*
- **Pass criterion:** Broken definitions never masquerade as clean `'complete'` expansions.
- **Defect logging:** Log any malformed `definingExpression` (including empty/whitespace strings) that silently skips validation or returns `'complete'`.

### Area 10 — Claimed Proof vs Independent Verification (`proofEvidence`)
- **What is tested:** Ensuring `formal_proof` never implies machine-checked or independent verification.
- **Test scenario:** Test all 6 `BasisEvidenceKind` values (`formal_proof`, `known_theorem_reference`, `experimental_confirmation`, `numeric_check`, `theoretical_hypothesis`, `missing`) and omitted `mathematicalBasis`.
- **Expected behavior:** `sourceClaimsProof` is `true` **only** for `formal_proof`; `independentlyVerified` and `machineVerified` are strictly `false` and `verificationSystem` is `null` across all cases; `missing` sets `mathematicalBasis.status: 'missing'` and adds a `missingInformation` entry.
- **Pass criterion:** No field anywhere in `semanticTransparency` claims independent or formal verification.
- **Defect logging:** Any boolean or string implying verified proof is a **Critical** defect.

### Area 11 — Backward Compatibility with UMFP Core & Legacy Contexts
- **What is tested:** Byte-for-byte identity of `FormulaPassport` and safe handling of legacy `SemanticContext` payloads (without `epistemicOrigin`).
- **Test scenario:** Compare `generatePassport(expr, ctx)` with `generateTransparentPassport(expr, ctx, semCtx).passport` across 10+ diverse expressions (fractions, sums, integrals, matrices, complex numbers, geometry identities, malformed inputs); verify legacy `SemanticContext` defaults `epistemicOrigin` to `'unknown'`.
- **Expected behavior:** `JSON.stringify(wrapped.passport) === JSON.stringify(corePassport)` for every input; `src/umfp-core/` untouched; legacy contexts produce `'unknown'` rather than guessing `'source_document'`.
- **Pass criterion:** Zero divergence in `FormulaPassport` and zero crashes on `0.1.0`-style inputs.
- **Defect logging:** Any discrepancy in `FormulaPassport` is a **Critical** architectural defect.

### Area 12 — Stress Testing on Real Scientific Publications *(Open Field Validation)*
- **What is tested:** End-to-end usability and failure modes when an AI agent applies UMFP + Semantic Transparency Extension to **real scientific papers** (e.g., arXiv preprints in physics, applied math, ML, or engineering) **without a pre-authored `SemanticContext`**.
- **Test scenario:**
  1. Select 3–5 formulas directly from a real scientific paper (including equations with scattered definitions across multiple pages, implicit index conventions, Greek letters, tensor/operator notation, empirical constants, and prose-only applicability conditions).
  2. Manually or via an independent extractor build `SemanticContext` strictly from what the paper actually states (marking inferred meanings as `'agent_inferred'` and unstated ones as omitted).
  3. Run `generateTransparentPassport` and inspect `passport`, `symbolEntries`, `diagnostics`, `missingInformation`, `proofEvidence`, and `transparencyStatus`.
- **Expected behavior:** The extension should preserve source traceability, distinguish explicit paper definitions from agent inferences (`agent_inferred`), flag missing parameters/conditions, and honestly surface parser/LaTeX mismatches (`UNSUPPORTED_LATEX_SYMBOL_MISMATCH`) instead of hiding gaps.
- **Pass criterion:** Reviewer documents both what worked and **where the schema or `umfp-core` boundary failed to represent real scientific notation faithfully** (e.g., tensor subscripts, PDE operators, implicit summation, multi-equation definitions, or conditions attached to whole formulas vs individual symbols).
- **Defect logging:** Capture exact paper citations/snippets (or synthetic equivalents), the constructed `SemanticContext`, observed JSON gaps, and concrete schema/parser improvement proposals.
