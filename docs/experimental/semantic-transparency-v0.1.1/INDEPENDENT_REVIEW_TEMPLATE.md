# Independent Review Report Template — `experimental/semantic-transparency-v0.1.1`

Use this template to submit an independent audit or stress-test report for **UMFP Semantic Transparency Extension (`0.1.1-semantic-ext`)**. Base every claim strictly on observed files, actual command outputs, and reproducible inputs.

---

## 1. Tested Branch & Version
- **Branch / Snapshot Tested:** `experimental/semantic-transparency-v0.1.1`
- **Extension Version (`extensionVersion`):** `0.1.1-semantic-ext`
- **UMFP Core Version (`umfpVersion`):**
- **Commit / Date Tested:**

## 2. Reviewing AI System / Researcher
- **System / Reviewer Name & Version:** *(e.g., Claude ..., DeepSeek ..., Gemini ..., or researcher name)*
- **Environment:** *(Node.js version, OS, execution method)*

## 3. Inspected Files & Baseline Verification
List the exact files read and the exact outputs observed from running baseline commands:
- **Files Inspected:**
  - `src/umfp-semantic/types.ts`
  - `src/umfp-semantic/semanticTransparency.ts`
  - `src/umfp-semantic/semantic-tests.ts`
  - `src/umfp-core/*` *(confirm whether untouched)*
  - `docs/experimental/semantic-transparency-v0.1.1/*`
- **Baseline Test Outputs Observed:**
  - `npm test`:
  - `npm run test:semantic`:
  - `npm run lint`:
  - `npm run build`:

## 4. Scenarios & Protocol Areas Executed
Indicate which areas of [`INDEPENDENT_TESTING_PROTOCOL.md`](./INDEPENDENT_TESTING_PROTOCOL.md) (1–12) were tested, including any real scientific papers used for Area 12:
- [ ] Area 1 — Semantic symbol resolution
- [ ] Area 2 — Recursive composite expansion
- [ ] Area 3 — Undocumented dependency detection
- [ ] Area 4 — `epistemicOrigin` tracking
- [ ] Area 5 — `provenance` tracking
- [ ] Area 6 — `sourceEvidence` traceability
- [ ] Area 7 — Ambiguity & conflict detection
- [ ] Area 8 — Unsupported LaTeX notations
- [ ] Area 9 — Malformed / partially parsed definitions
- [ ] Area 10 — `proofEvidence` separation
- [ ] Area 11 — `UMFP Core` & legacy backward compatibility
- [ ] Area 12 — Real scientific publication stress test *(cite paper/equations if tested)*

## 5. Confirmed Capabilities
List only behaviors directly verified in runtime execution:
- ...

## 6. Discovered Defects
Use the standard format for each defect:
- **Defect ID:**
- **Protocol Area:**
- **Severity:** `Critical | High | Medium | Low`
- **Summary:**
- **File / Line Reference:**

## 7. Reproducible Counterexamples
Provide exact, copy-pasteable `npx tsx -e "..."` commands or minimal JSON inputs that trigger failures, false completeness, silent drops, or edge-case bugs:
```bash
# Reproducible counterexample command
```

## 8. Discrepancies Between Expected and Actual Behavior
| Case | Expected Behavior | Actual Behavior | Impact |
| :--- | :--- | :--- | :--- |
| | | | |

## 9. Improvement Proposals
Concrete, non-destructive recommendations (distinguishing changes limited to `src/umfp-semantic/` from changes that would require `src/umfp-core/`):
1. ...

## 10. Overall Verdict
- **Assessment:** *(Select one: `Sound for continued experimentation` | `Needs targeted fixes before wider trials` | `Architectural gaps block adoption`)*
- **Should this branch be merged into `main` now?** `No` *(unless explicit acceptance criteria are met and core stability is preserved)*
- **Concise Rationale:**
