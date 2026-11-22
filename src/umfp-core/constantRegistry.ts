/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConstantKind, MathematicalConstant, PassportConstantEntry } from './types';

export const CONSTANT_REGISTRY: MathematicalConstant[] = [
  {
    constantId: 'MATH_CONST_PI',
    canonicalName: 'Pi',
    symbol: 'π',
    aliases: ['pi', '\\pi'],
    kind: 'TRANSCENDENTAL',
    numberDomain: 'REAL',
    exactValue: 'π',
    approximation: 3.141592653589793,
    definition: "Ratio of a circle's circumference to its diameter",
    minimalPolynomial: null,
    properties: ['positive', 'irrational', 'transcendental'],
    contexts: ['GEOMETRY', 'ALGEBRA'],
    approximationPrecision: 15,
  },
  {
    constantId: 'MATH_CONST_E',
    canonicalName: 'Euler Number',
    symbol: 'e',
    aliases: ['EULER_NUMBER'],
    kind: 'TRANSCENDENTAL',
    numberDomain: 'REAL',
    exactValue: 'e',
    approximation: 2.718281828459045,
    definition: 'Base of the natural logarithm',
    minimalPolynomial: null,
    properties: ['positive', 'irrational', 'transcendental'],
    contexts: ['ALGEBRA'],
    approximationPrecision: 15,
  },
  {
    constantId: 'MATH_CONST_PHI',
    canonicalName: 'Golden Ratio',
    symbol: 'φ',
    aliases: ['phi', '\\phi', '\\varphi'],
    kind: 'ALGEBRAIC',
    numberDomain: 'REAL',
    exactValue: '(1 + sqrt(5)) / 2',
    approximation: 1.618033988749895,
    definition: 'Positive root of x^2 - x - 1 = 0',
    minimalPolynomial: 'x^2 - x - 1',
    properties: ['positive', 'irrational', 'algebraic', 'degree_2'],
    contexts: ['ALGEBRA', 'GEOMETRY'],
    approximationPrecision: 15,
  },
  {
    constantId: 'MATH_CONST_SQRT2',
    canonicalName: 'Square Root of Two',
    symbol: '√2',
    aliases: ['sqrt(2)', '\\sqrt{2}'],
    kind: 'ALGEBRAIC',
    numberDomain: 'REAL',
    exactValue: 'sqrt(2)',
    approximation: 1.4142135623730951,
    definition: 'Positive square root of 2',
    minimalPolynomial: 'x^2 - 2',
    properties: ['positive', 'irrational', 'algebraic', 'degree_2'],
    contexts: ['ALGEBRA', 'GEOMETRY'],
    approximationPrecision: 16,
  },
  {
    constantId: 'MATH_CONST_SQRT3',
    canonicalName: 'Square Root of Three',
    symbol: '√3',
    aliases: ['sqrt(3)', '\\sqrt{3}'],
    kind: 'ALGEBRAIC',
    numberDomain: 'REAL',
    exactValue: 'sqrt(3)',
    approximation: 1.7320508075688772,
    definition: 'Positive square root of 3',
    minimalPolynomial: 'x^2 - 3',
    properties: ['positive', 'irrational', 'algebraic', 'degree_2'],
    contexts: ['ALGEBRA', 'GEOMETRY'],
    approximationPrecision: 16,
  },
  {
    constantId: 'MATH_CONST_I',
    canonicalName: 'Imaginary Unit',
    symbol: 'i',
    aliases: ['imaginary_unit'],
    kind: 'IMAGINARY_UNIT',
    numberDomain: 'COMPLEX',
    exactValue: 'sqrt(-1)',
    approximation: null,
    definition: 'Complex number satisfying i^2 = -1',
    minimalPolynomial: 'x^2 + 1',
    properties: ['imaginary_unit', 'complex'],
    contexts: ['ALGEBRA'],
    approximationPrecision: null,
  },
];

export const NUMERIC_SPECIAL_REGISTRY: MathematicalConstant[] = [
  {
    constantId: 'MATH_NUM_ZERO',
    canonicalName: 'Zero',
    symbol: '0',
    aliases: ['0'],
    kind: 'NUMERIC_SPECIAL',
    numberDomain: 'REAL',
    exactValue: '0',
    approximation: 0,
    definition: 'Additive identity element',
    minimalPolynomial: 'x',
    properties: ['integer', 'rational', 'additive_identity'],
    contexts: ['ALGEBRA', 'GEOMETRY'],
    approximationPrecision: null,
  },
  {
    constantId: 'MATH_NUM_ONE',
    canonicalName: 'One',
    symbol: '1',
    aliases: ['1'],
    kind: 'NUMERIC_SPECIAL',
    numberDomain: 'REAL',
    exactValue: '1',
    approximation: 1,
    definition: 'Multiplicative identity element',
    minimalPolynomial: 'x - 1',
    properties: ['positive', 'integer', 'rational', 'multiplicative_identity'],
    contexts: ['ALGEBRA', 'GEOMETRY'],
    approximationPrecision: null,
  },
];

const BY_ID = new Map<string, MathematicalConstant>();
const BY_ALIAS = new Map<string, MathematicalConstant>();
const NUMERIC_SPECIAL_BY_VALUE = new Map<string, MathematicalConstant>();

for (const entry of CONSTANT_REGISTRY) {
  BY_ID.set(entry.constantId, entry);
  BY_ALIAS.set(entry.symbol, entry);
  for (const alias of entry.aliases) {
    BY_ALIAS.set(alias, entry);
  }
}

for (const entry of NUMERIC_SPECIAL_REGISTRY) {
  BY_ID.set(entry.constantId, entry);
  NUMERIC_SPECIAL_BY_VALUE.set(entry.symbol, entry);
}

export function getConstantById(constantId: string): MathematicalConstant | undefined {
  return BY_ID.get(constantId);
}

export function lookupConstantByAlias(token: string): MathematicalConstant | undefined {
  return BY_ALIAS.get(token);
}

export function lookupNumericSpecial(value: string): MathematicalConstant | undefined {
  return NUMERIC_SPECIAL_BY_VALUE.get(value);
}

export function toPassportConstantEntry(
  constant: MathematicalConstant,
  occurrences: number
): PassportConstantEntry {
  return {
    constantId: constant.constantId,
    symbol: constant.symbol,
    canonicalName: constant.canonicalName,
    kind: constant.kind,
    numberDomain: constant.numberDomain,
    exactValue: constant.exactValue,
    approximation: constant.approximation,
    minimalPolynomial: constant.minimalPolynomial ?? null,
    properties: [...constant.properties],
    contexts: [...constant.contexts],
    occurrences,
  };
}

export function isMathematicalConstantKind(kind: ConstantKind): boolean {
  return kind !== 'NUMERIC_SPECIAL';
}
