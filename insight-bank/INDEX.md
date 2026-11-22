# UMFP Insight Bank — Index

**Status:** `Initial Experimental Knowledge Seed` (6 pilot entries in `PYTHAGOREAN FAMILY`).  
See [`README.md`](./README.md) for the specification, status discipline, and AI-agent protocol, and [`RESEARCH_STATUS.md`](../docs/RESEARCH_STATUS.md) for the overall project status.

> **Verification Note:** The **Status** column below (`VERIFIED` / `DERIVED`) reflects **Mathematical Verification** of the entry's proof or derivation. The **UMFP `0.1.x` Domain** column reflects **UMFP Passport Reproducibility** (`generatePassport` output). The two are independent layers.

---

## Family: `PYTHAGOREAN FAMILY` (`geometry/pythagorean-family/`)

| ID | Title | Core Formula | Category | Mathematical Status | UMFP `0.1.x` Domain (`generatePassport`) | File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PTH-001` | Классическая теорема Пифагора | `a^2 + b^2 = c^2` | `Classical Patterns` | `VERIFIED` | `GEOMETRY` (`known_identity`) | [`PTH-001.md`](./geometry/pythagorean-family/PTH-001.md) |
| `PTH-002` | Подобные фигуры на сторонах треугольника | `S_a + S_b = S_c` | `Geometric Extensions` | `DERIVED` | `ALGEBRA` (`structural_rules`) | [`PTH-002.md`](./geometry/pythagorean-family/PTH-002.md) |
| `PTH-003` | Окружности в квадратах на сторонах | `A + B = C` (`A = \pi a^2 / 4`) | `Geometric Extensions` | `DERIVED` | `ALGEBRA` (`structural_rules`) | [`PTH-003.md`](./geometry/pythagorean-family/PTH-003.md) |
| `PTH-004` | Окружности на сторонах и вписанная окружность | `\sqrt{C} + \sqrt{D} = \sqrt{A} + \sqrt{B}` | `Mathematical Relations` | `DERIVED` | `ALGEBRA` (`structural_rules`, `RADICAL: 4`) | [`PTH-004.md`](./geometry/pythagorean-family/PTH-004.md) |
| `PTH-005` | Высота и проекции на гипотенузу | `a^2 = c * p`, `b^2 = c * q` | `Mathematical Relations` | `DERIVED` | `ALGEBRA` (`structural_rules`) | [`PTH-005.md`](./geometry/pythagorean-family/PTH-005.md) |
| `GEO-PYT-002` | Равносторонние треугольники на сторонах | `S_A + S_B = S_C` (`S = (\sqrt{3}/4) x^2`) | `Geometric Extensions` | `DERIVED` | `ALGEBRA` (`structural_rules`, `MATH_CONST_SQRT3`) | [`GEO-PYT-002.md`](./geometry/pythagorean-family/GEO-PYT-002.md) |

---

## Reserved Sections (Empty in `0.1.x` Initial Seed)

- `algebra/` — Algebraic identities and factorizations (planned).
- `general/` — Cross-domain scaling analogies (planned).
