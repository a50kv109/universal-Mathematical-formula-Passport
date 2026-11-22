/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LogicalOrganizationKind,
  MathematicalDomainKind,
  StructuralConstructKind,
} from '../umfp-core/types';

export interface FormulaPreset {
  id: string;
  name: { ru: string; en: string };
  formula: string;
  note: { ru: string; en: string };
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    id: 'nested-frac-rad',
    name: {
      ru: 'Вложенная дробь с радикалом',
      en: 'Nested Fraction & Radical',
    },
    formula: '\\frac{\\sqrt{a+b}}{\\frac{c+d}{e}}',
    note: {
      ru: 'Проверка композиционной глубины: дробь в знаменателе и корень в числителе + ограничения знаменателей.',
      en: 'Composition depth test: fraction in denominator, radical in numerator, and denominator constraints.',
    },
  },
  {
    id: 'rational-eq',
    name: {
      ru: 'Рациональное уравнение с 3 дробями',
      en: 'Rational Equation (3 Fractions)',
    },
    formula: '\\frac{1}{x} + \\frac{1}{y} = \\frac{1}{z}',
    note: {
      ru: 'Уравнение с тремя независимыми ограничениями ненулевых знаменателей.',
      en: 'Equation generating three independent non-zero denominator constraints.',
    },
  },
  {
    id: 'linear-vs-stacked',
    name: {
      ru: 'Линейная дробь со скобками',
      en: 'Grouped Linear Fraction',
    },
    formula: '(a+b)/(c-d)',
    note: {
      ru: 'Отличается от атомарного a/b наличием структурных границ групп (числитель/знаменатель).',
      en: 'Distinguished from atomic a/b by explicit group boundaries (numerator/denominator).',
    },
  },
  {
    id: 'euler',
    name: {
      ru: 'Формула Эйлера (Инвариант)',
      en: "Euler's Polyhedron Formula",
    },
    formula: 'V - E + F = 2',
    note: {
      ru: 'Базовый топологический инвариант M1 без композиционных конструкций.',
      en: 'Baseline M1 topological invariant without compositional constructs.',
    },
  },
  {
    id: 'binomial',
    name: {
      ru: 'Квадрат суммы (Тождество)',
      en: 'Square of Sum (Identity)',
    },
    formula: '(a + b)^2 = a^2 + 2ab + b^2',
    note: {
      ru: 'Симметричное квадратичное тождество, связывающее факторизацию и разложение.',
      en: 'Symmetric quadratic identity relating factorised and expanded forms.',
    },
  },
  {
    id: 'integral',
    name: {
      ru: 'Определённый интеграл',
      en: 'Definite Integral',
    },
    formula: 'int(a,b,f(x),x)',
    note: {
      ru: 'Композиционная конструкция INTEGRAL со слотами lowerBound, upperBound, integrand, variable.',
      en: 'INTEGRAL construct with explicit lowerBound, upperBound, integrand, and variable slots.',
    },
  },
  {
    id: 'system',
    name: {
      ru: 'Система уравнений',
      en: 'Equation System',
    },
    formula: '{x+y=5, x-y=1}',
    note: {
      ru: 'Контейнер EQUATION_SYSTEM, объединяющий несколько независимых отношений.',
      en: 'EQUATION_SYSTEM container aggregating multiple independent relations.',
    },
  },
  {
    id: 'circle-area',
    name: {
      ru: 'Площадь круга (Константа π)',
      en: 'Circle Area (Constant π)',
    },
    formula: 'S = πr^2',
    note: {
      ru: 'Распознаёт константу MATH_CONST_PI в Constant Registry и геометрический шаблон.',
      en: 'Identifies MATH_CONST_PI in Constant Registry and geometric circle pattern.',
    },
  },
  {
    id: 'golden-ratio',
    name: {
      ru: 'Золотое сечение (Константа φ)',
      en: 'Golden Ratio Identity (Constant φ)',
    },
    formula: 'φ^2 = φ + 1',
    note: {
      ru: 'Алгебраическая константа MATH_CONST_PHI с минимальным многочленом x^2 - x - 1 (домен ALGEBRA).',
      en: 'Algebraic constant MATH_CONST_PHI with minimal polynomial x^2 - x - 1 (domain ALGEBRA).',
    },
  },
];

export const CONSTRUCT_MATRIX: Array<{
  kind: StructuralConstructKind;
  name: { ru: string; en: string };
  slots: string[];
  sample: string;
  desc: { ru: string; en: string };
}> = [
  {
    kind: 'FRACTION',
    name: { ru: 'Дробь', en: 'Fraction' },
    slots: ['numerator', 'denominator'],
    sample: '\\frac{a+b}{c-d}',
    desc: {
      ru: 'Композиционный контейнер отношения с явным числителем, знаменателем и ограничением != 0.',
      en: 'Compositional ratio container with explicit numerator, denominator, and != 0 constraint.',
    },
  },
  {
    kind: 'RADICAL',
    name: { ru: 'Корень / Радикал', en: 'Radical' },
    slots: ['radicand', 'index?'],
    sample: '\\sqrt[3]{a+b}',
    desc: {
      ru: 'Корневая конструкция с подкоренным выражением и опциональным показателем.',
      en: 'Root construct containing radicand and optional index slot.',
    },
  },
  {
    kind: 'ABSOLUTE_VALUE',
    name: { ru: 'Модуль / Норма', en: 'Absolute Value' },
    slots: ['operand'],
    sample: '|a-b|',
    desc: {
      ru: 'Оператор вертикальных границ; различает контекстное значение (модуль, норма, мощность).',
      en: 'Delimited bar construct distinguishing scalar magnitude from norm/cardinality ambiguity.',
    },
  },
  {
    kind: 'MATRIX',
    name: { ru: 'Матрица', en: 'Matrix' },
    slots: ['rows', 'elements'],
    sample: '[[a,b],[c,d]]',
    desc: {
      ru: 'Двумерная табличная структура элементов с размерностью rows × cols.',
      en: 'Two-dimensional structured array preserving row/column dimensions.',
    },
  },
  {
    kind: 'DETERMINANT',
    name: { ru: 'Определитель', en: 'Determinant' },
    slots: ['target'],
    sample: 'det(A)',
    desc: {
      ru: 'Отображение матрицы или матричного выражения в скалярную характеристику.',
      en: 'Scalar determinant operator targeting a matrix or symbolic matrix identifier.',
    },
  },
  {
    kind: 'INDEXED_SUM',
    name: { ru: 'Индексированная сумма', en: 'Indexed Sum' },
    slots: ['index', 'lowerBound', 'upperBound', 'body'],
    sample: 'sum(i=1..n, a_i)',
    desc: {
      ru: 'Агрегирующий итератор суммирования с переменной индекса и пределами.',
      en: 'Iterative summation binder with index, lower/upper bounds, and body expression.',
    },
  },
  {
    kind: 'INDEXED_PRODUCT',
    name: { ru: 'Индексированное произведение', en: 'Indexed Product' },
    slots: ['index', 'lowerBound', 'upperBound', 'body'],
    sample: 'prod(i=1..n, a_i)',
    desc: {
      ru: 'Агрегирующий итератор умножения с переменной индекса и границами.',
      en: 'Iterative multiplicative binder with index, bounds, and body expression.',
    },
  },
  {
    kind: 'INTEGRAL',
    name: { ru: 'Интеграл', en: 'Integral' },
    slots: ['integrand', 'variable', 'lowerBound?', 'upperBound?'],
    sample: 'int(a,b,f(x),x)',
    desc: {
      ru: 'Определённое или неопределённое интегрирование с подынтегральным выражением и переменной.',
      en: 'Definite or indefinite integral separating integrand, variable, and optional bounds.',
    },
  },
  {
    kind: 'LIMIT',
    name: { ru: 'Предел', en: 'Limit' },
    slots: ['variable', 'approach', 'body', 'direction?'],
    sample: 'lim(x->a,f(x))',
    desc: {
      ru: 'Предельный переход со стремлением переменной к точке (и опциональным направлением).',
      en: 'Limit operator capturing variable, target approach point, body, and direction.',
    },
  },
  {
    kind: 'EQUATION_SYSTEM',
    name: { ru: 'Система уравнений', en: 'Equation System' },
    slots: ['equations'],
    sample: '{x+y=5, x-y=1}',
    desc: {
      ru: 'Конъюнктивное множество совместных уравнений или ограничений.',
      en: 'Conjunctive container holding multiple simultaneous equations or constraints.',
    },
  },
];

export const LOGICAL_CLASS_MATRIX: Array<{
  kind: LogicalOrganizationKind;
  code: string;
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
  sample: string;
}> = [
  {
    kind: 'SUMMATION',
    code: 'LC-01',
    name: { ru: 'Суммирование', en: 'Summation' },
    desc: { ru: 'Аддитивная композиция независимых слагаемых.', en: 'Additive composition of terms.' },
    sample: 'a+b*c',
  },
  {
    kind: 'DIFFERENCE',
    code: 'LC-02',
    name: { ru: 'Разность / Градиент', en: 'Difference' },
    desc: { ru: 'Сравнительное вычитание или контраст величин.', en: 'Comparative subtraction or divergence.' },
    sample: 'a - b',
  },
  {
    kind: 'PRODUCT',
    code: 'LC-03',
    name: { ru: 'Произведение', en: 'Product' },
    desc: { ru: 'Мультипликативное связывание множителей.', en: 'Multiplicative scaling of factors.' },
    sample: '2*a*b',
  },
  {
    kind: 'QUOTIENT',
    code: 'LC-04',
    name: { ru: 'Отношение / Частное', en: 'Quotient' },
    desc: { ru: 'Неполиномиальное или общее отношение двух структур.', en: 'General ratio relation between numerator and denominator.' },
    sample: '\\frac{\\sqrt{a+b}}{c}',
  },
  {
    kind: 'FACTORISATION',
    code: 'LC-05',
    name: { ru: 'Факторизация', en: 'Factorisation' },
    desc: { ru: 'Свёрнутая мультипликативная или степенная форма.', en: 'Factored product or power-of-sum representation.' },
    sample: '(a+b)^2',
  },
  {
    kind: 'EXPANSION',
    code: 'LC-06',
    name: { ru: 'Разложение (Многочлен)', en: 'Expansion' },
    desc: { ru: 'Раскрытая полиномиальная сумма одночленов.', en: 'Expanded sum of polynomial monomials.' },
    sample: 'a^2+2ab+b^2',
  },
  {
    kind: 'SYMMETRY',
    code: 'LC-07',
    name: { ru: 'Симметричная организация', en: 'Symmetry' },
    desc: { ru: 'Инвариантность значения при перестановке переменных.', en: 'Value invariance under variable permutation.' },
    sample: '(a+b)^2',
  },
  {
    kind: 'INVARIANT',
    code: 'LC-08',
    name: { ru: 'Инвариант сохранения', en: 'Invariant' },
    desc: { ru: 'Выражение сохраняющейся константной величины.', en: 'Relation equating multi-variable expression to conserved constant.' },
    sample: 'V-E+F=2',
  },
  {
    kind: 'RATIONAL_EXPRESSION',
    code: 'LC-09',
    name: { ru: 'Рациональная организация', en: 'Rational Expression' },
    desc: { ru: 'Назначается ТОЛЬКО при чисто алгебраическом отношении полиномов.', en: 'Assigned ONLY for pure polynomial ratios, never blindly for all FRACTION nodes.' },
    sample: '\\frac{a+b}{c-d}',
  },
  {
    kind: 'RADICAL_DEPENDENCE',
    code: 'LC-10',
    name: { ru: 'Радикальная зависимость', en: 'Radical Dependence' },
    desc: { ru: 'Иррациональная или корневая зависимость аргументов.', en: 'Irrational or root-governed dependency.' },
    sample: '\\sqrt[3]{a+b}',
  },
  {
    kind: 'INDEXED_AGGREGATION',
    code: 'LC-11',
    name: { ru: 'Индексированная агрегация', en: 'Indexed Aggregation' },
    desc: { ru: 'Свёртывание семейства элементов по индексу.', en: 'Reduction across an indexed sequence.' },
    sample: 'sum(i=1..n, a_i)',
  },
  {
    kind: 'INTEGRAL_TRANSFORMATION',
    code: 'LC-12',
    name: { ru: 'Интегральное преобразование', en: 'Integral Transformation' },
    desc: { ru: 'Непрерывное накопление и операторное отображение.', en: 'Continuous accumulation operator.' },
    sample: 'int(a,b,f(x),x)',
  },
  {
    kind: 'LIMIT_PROCESS',
    code: 'LC-13',
    name: { ru: 'Предельный процесс', en: 'Limit Process' },
    desc: { ru: 'Асимптотический анализ поведения в окрестности точки.', en: 'Asymptotic neighborhood behavior.' },
    sample: 'lim(x->a,f(x))',
  },
  {
    kind: 'MATRIX_TRANSFORMATION',
    code: 'LC-14',
    name: { ru: 'Матричная структура', en: 'Matrix Transformation' },
    desc: { ru: 'Линейный оператор в координатном представлении.', en: 'Linear operator in array basis.' },
    sample: '[[a,b],[c,d]]',
  },
  {
    kind: 'DETERMINANT_STRUCTURE',
    code: 'LC-15',
    name: { ru: 'Детерминантная структура', en: 'Determinant Structure' },
    desc: { ru: 'Ориентированный объём и критерий обратимости.', en: 'Oriented volume & invertibility scalar.' },
    sample: 'det(A)',
  },
  {
    kind: 'EQUATION_RELATION',
    code: 'LC-16',
    name: { ru: 'Уравнение / Система отношений', en: 'Equation Relation' },
    desc: { ru: 'Фиксация равенства или совместных условий.', en: 'Equality or simultaneous constraint system.' },
    sample: '{x+y=5, x-y=1}',
  },
  {
    kind: 'POWER_DEPENDENCE',
    code: 'LC-17',
    name: { ru: 'Степенная зависимость', en: 'Power Dependence' },
    desc: { ru: 'Наличие явного возведения в степень (^).', en: 'Presence of explicit exponentiation (^).' },
    sample: '\\sin^{2}(x)',
  },
  {
    kind: 'COMPOSITION',
    code: 'LC-18',
    name: { ru: 'Вложенная композиция', en: 'Nested Composition' },
    desc: { ru: 'Комбинация нескольких структурных контейнеров глубиной >= 2.', en: 'Multi-level nesting of structural constructs (depth >= 2).' },
    sample: '\\frac{\\sqrt{a+b}}{\\frac{c+d}{e}}',
  },
];

export const DOMAIN_LIST: MathematicalDomainKind[] = [
  'ALGEBRA',
  'GEOMETRY',
  'UNKNOWN',
];

export const COMPARE_PRESETS = [
  {
    label: { ru: 'Дробь: LaTeX vs Линейная', en: 'Fraction: Stacked vs Linear' },
    a: '\\frac{a+b}{c-d}',
    b: '(a+b)/(c-d)',
  },
  {
    label: { ru: 'Корень: \\sqrt{x} vs \\sqrt[2]{x}', en: 'Radical: \\sqrt{x} vs \\sqrt[2]{x}' },
    a: '\\sqrt{x}',
    b: '\\sqrt[2]{x}',
  },
  {
    label: { ru: 'Невалидное 1/0 vs 1/0', en: 'Invalid 1/0 vs 1/0' },
    a: '1/0',
    b: '1/0',
  },
  {
    label: { ru: 'Бином: (a+b)^2 vs многочлен', en: 'Binomial: Factored vs Expanded' },
    a: '(a + b)^2',
    b: 'a^2 + 2ab + b^2',
  },
  {
    label: { ru: 'Экспонента: exp(x) vs e^x', en: 'Exponential: exp(x) vs e^x' },
    a: 'exp(x)',
    b: 'e^x',
  },
  {
    label: { ru: 'Изоморфизм схем (переименование)', en: 'Schema Isomorphism (Alpha-rename)' },
    a: '\\frac{a+b}{c-d}',
    b: '\\frac{x+y}{z-w}',
  },
  {
    label: { ru: 'Приоритет: a+b*c vs (a+b)*c', en: 'Precedence: a+b*c vs (a+b)*c' },
    a: 'a+b*c',
    b: '(a+b)*c',
  },
];
