# Changelog — UMFP Semantic Transparency Extension

All notable iterations of the decoupled Semantic Transparency Extension (`src/umfp-semantic/`) are documented here. `src/umfp-core/` (`0.1.0`) remained untouched across all versions below.

---

## `0.1.1-semantic-ext` — Corrective Release (Experimental Audit Branch)

Implemented localized, non-architectural fixes directly addressing findings from the independent post-implementation audit of `0.1.0-semantic-ext`:

### Added
- **Recursive `expanded_dependency` Materialization (`ST-C01`):** Added `'expanded_dependency'` to `SemanticSymbolEntry['roleInFormula']` and `expandedDependencyCount` to `SemanticTransparencyMetrics`. Discovered intermediate and leaf variables from `definingExpression` expansions are now resolved into `symbolEntries` with preserved `meaning`, `units`, `conditions`, `provenance`, `epistemicOrigin`, and `sourceEvidence`.
- **Epistemic Origin Tracking (`EpistemicOriginKind`):** Added optional `epistemicOrigin` (`'source_document' | 'reference_knowledge' | 'agent_inferred' | 'unknown'`) on `SemanticSymbolInput`, `MathematicalBasisInput`, `SemanticSymbolEntry`, and `MathematicalBasisReport`, strictly separated from mathematical `provenance`. Legacy `SemanticContext` payloads omitting `epistemicOrigin` default to `'unknown'`.
- **Structured Diagnostics (`diagnostics: SemanticDiagnostic[]`):** Added codes `UNMATCHED_CONTEXT_SYMBOL`, `UNSUPPORTED_LATEX_SYMBOL_MISMATCH`, `EXPANSION_PARSE_FAILED`, `EXPANSION_PARSE_PARTIAL`, `EXPANSION_CYCLE_DETECTED`, and `AGENT_INFERRED_UNVERIFIED`.
- **Proof Evidence Structure (`ProofEvidenceReport`):** Added `proofEvidence` (`{ sourceClaimsProof, independentlyVerified, machineVerified, verificationSystem, note }`) replacing `isFormalProof`.
- **Corrective Test Suite (`ST-C01`–`ST-C08`):** Expanded `src/umfp-semantic/semantic-tests.ts` from 7 to 15 test cases (`15/15` passing in local verification).
- **Experimental Audit Documentation:** Added `docs/experimental/semantic-transparency-v0.1.1/` (`EXPERIMENTAL_BRANCH.md`, `EXPERIMENTAL_README.md`, `INDEPENDENT_TESTING_PROTOCOL.md`, `KNOWN_LIMITATIONS.md`, `CHANGELOG.md`, `INDEPENDENT_REVIEW_TEMPLATE.md`) and updated `docs/SEMANTIC_TRANSPARENCY.md`.

### Fixed
- **False Completeness (`ST-C02`):** Undocumented expanded leaf variables (e.g., `a, b, c` omitted in `S = p * r`, `p = (a + b + c) / 2`) now increment `undocumentedCount`, populate `missingInformation`, and block `transparencyStatus: 'complete'`.
- **Silent Context / LaTeX Token Loss (`ST-C03`):** Unmatched `SemanticContext.symbols` keys now emit `UNMATCHED_CONTEXT_SYMBOL`, and unsupported LaTeX tokens present in the source formula (such as `\kappa` in `F = \kappa * (v / L_0)`) emit `UNSUPPORTED_LATEX_SYMBOL_MISMATCH`, populate `missingInformation`, and block `transparencyStatus: 'complete'` without guessing or substituting.
- **Unchecked Expansion & Root Parse Status (`ST-C04`):** `definingExpression` expansions with `parseStatus !== 'parsed'` (including `'partial'` cases with empty `validationErrors`, e.g. `'1 / ('`) now emit `EXPANSION_PARSE_PARTIAL` / `EXPANSION_PARSE_FAILED`, add `missingInformation` entries, and block `'complete'`. Root `passport.parseStatus !== 'parsed'` also blocks `'complete'`.

### Changed (Breaking Schema Change Within Experimental Extension)
- Replaced `MathematicalBasisReport.isFormalProof: boolean` with `MathematicalBasisReport.proofEvidence: ProofEvidenceReport`.

### Unresolved Issues
- See [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) — notably: lack of real-paper field evaluation without pre-authored `SemanticContext`, no automatic PDF/prose extraction, no unit/dimensional verification, and reliance on `umfp-core` tokenization for unsupported LaTeX commands.

---

## Independent Post-Implementation Audit (Between `0.1.0` and `0.1.1`)

Probes against `0.1.0-semantic-ext` confirmed architectural alignment with frozen `umfp-core`, but uncovered 6 substantive issues:
1. **False completeness** on composite expansions when leaf variables were omitted from `SemanticContext`.
2. **Discarded leaf metadata** (`symbolEntries` omitted expanded leaves, losing `units`, `conditions`, `sourceEvidence`).
3. **Silent context mismatch** when `umfp-core` failed to tokenize unsupported LaTeX symbols like `\kappa` or when `SemanticContext.symbols` contained unused keys.
4. **Unreported `parseStatus !== 'parsed'`** on malformed `definingExpression` strings when `validationErrors` was empty.
5. **Conflation risk** between source-document attribution and agent-inferred guesses (`epistemicOrigin` missing).
6. **Ambiguity of `isFormalProof: true`**, which could be misread as independent verification rather than a source claim.

---

## `0.1.0-semantic-ext` — Initial Implementation

- Created decoupled layer `src/umfp-semantic/` (`types.ts`, `semanticTransparency.ts`, `semantic-tests.ts`) wrapping `generatePassport` without modifying `src/umfp-core/`.
- Implemented initial symbol resolution (`well_known`, `composite_derived`, `author_defined`, `ambiguous`, `undocumented`), `ConstantRegistry` integration, recursive `definingExpression` parsing via `umfp-core` with cycle detection (`MAX_EXPANSION_DEPTH = 6`), `mathematicalBasis` classification, and initial 7 unit tests (`ST-01`–`ST-07`).
