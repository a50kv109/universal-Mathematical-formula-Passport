/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createNode, makeSpan } from './ast';
import { getConstantById, lookupConstantByAlias, lookupNumericSpecial } from './constantRegistry';
import { AstNode, DiagnosticMessage, ParseContext } from './types';

export interface ParseResult {
  rawAst: AstNode;
  parseStatus: 'parsed' | 'partial' | 'failed';
  diagnostics: DiagnosticMessage[];
}

const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'exp',
]);

const KNOWN_SYMBOLS = new Set([
  'pi', 'theta', 'alpha', 'beta', 'gamma', 'delta',
  'epsilon', 'lambda', 'mu', 'sigma', 'phi', 'psi', 'omega', 'Omega',
  'infty', 'inf',
]);

/**
 * Splits top-level comma-separated arguments respecting (), [], {}, and ||.
 */
function splitTopLevelArgs(content: string, baseOffset: number): Array<{ text: string; start: number; end: number }> {
  const args: Array<{ text: string; start: number; end: number }> = [];
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let absActive = false;
  let segStart = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(0, bracket - 1);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(0, brace - 1);
    else if (ch === '|') absActive = !absActive;
    else if (ch === ',' && paren === 0 && bracket === 0 && brace === 0 && !absActive) {
      args.push({
        text: content.slice(segStart, i),
        start: baseOffset + segStart,
        end: baseOffset + i,
      });
      segStart = i + 1;
    }
  }

  args.push({
    text: content.slice(segStart),
    start: baseOffset + segStart,
    end: baseOffset + content.length,
  });

  return args.filter((a) => a.text.trim().length > 0);
}

/**
 * Splits top-level separator (e.g. '\\' or '&') inside LaTeX environments.
 */
function splitByDelimiter(content: string, delim: string, baseOffset: number): Array<{ text: string; start: number; end: number }> {
  const parts: Array<{ text: string; start: number; end: number }> = [];
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let segStart = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(0, brace - 1);
    else if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(0, bracket - 1);
    else if (
      brace === 0 &&
      paren === 0 &&
      bracket === 0 &&
      content.startsWith(delim, i)
    ) {
      parts.push({
        text: content.slice(segStart, i),
        start: baseOffset + segStart,
        end: baseOffset + i,
      });
      i += delim.length - 1;
      segStart = i + 1;
    }
  }

  parts.push({
    text: content.slice(segStart),
    start: baseOffset + segStart,
    end: baseOffset + content.length,
  });

  return parts.filter((p) => p.text.trim().length > 0);
}

function readBalancedGroup(
  src: string,
  pos: number,
  openChar: string,
  closeChar: string
): { content: string; endPos: number } | null {
  if (src[pos] !== openChar) return null;
  let depth = 0;
  for (let i = pos; i < src.length; i++) {
    if (src[i] === openChar) depth++;
    else if (src[i] === closeChar) {
      depth--;
      if (depth === 0) {
        return {
          content: src.slice(pos + 1, i),
          endPos: i + 1,
        };
      }
    }
  }
  return null;
}

class ExpressionParser {
  private src: string;
  private offsetBase: number;
  private pos: number = 0;
  private diagnostics: DiagnosticMessage[];
  private context: ParseContext;
  private boundVariables: Set<string>;
  private inLogContext: boolean;

  constructor(
    src: string,
    offsetBase = 0,
    diagnostics: DiagnosticMessage[] = [],
    context: ParseContext = {},
    boundVariables: Set<string> = new Set(),
    inLogContext = false
  ) {
    this.src = src;
    this.offsetBase = offsetBase;
    this.diagnostics = diagnostics;
    this.context = context;
    this.boundVariables = boundVariables;
    this.inLogContext = inLogContext;
  }

  private skipWhitespace() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }

  private startsWith(str: string): boolean {
    return this.src.startsWith(str, this.pos);
  }

  private parseSub(
    text: string,
    subOffset: number,
    extraBoundVars?: string[],
    logCtx?: boolean
  ): AstNode {
    const nextBound =
      extraBoundVars && extraBoundVars.length > 0
        ? new Set([...this.boundVariables, ...extraBoundVars])
        : this.boundVariables;
    const subParser = new ExpressionParser(
      text,
      subOffset,
      this.diagnostics,
      this.context,
      nextBound,
      logCtx ?? this.inLogContext
    );
    return subParser.parse();
  }

  private resolveBinderNames(rawName: string, binderNode?: AstNode): string[] {
    const names = new Set<string>();
    const trimmed = rawName.trim();
    if (trimmed) names.add(trimmed);
    if (binderNode?.kind === 'variable' && binderNode.value) {
      names.add(binderNode.value);
    }
    return Array.from(names);
  }

  private makeConstantRefNode(
    constantId: string,
    raw: string,
    start: number,
    end: number
  ): AstNode {
    const entry = getConstantById(constantId);
    return createNode('constant_ref', {
      constantId,
      symbol: entry?.symbol ?? raw,
      canonicalName: entry?.canonicalName ?? constantId,
      value: entry?.symbol ?? raw,
      representation: 'linear',
      raw,
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + end),
    });
  }

  public parse(): AstNode {
    this.skipWhitespace();
    if (this.pos >= this.src.length) {
      this.diagnostics.push({
        level: 'warning',
        code: 'EMPTY_EXPRESSION',
        message: 'Empty expression or sub-expression encountered.',
        span: makeSpan(this.offsetBase, this.offsetBase),
      });
      return createNode('unknown', {
        value: '',
        raw: '',
        sourceSpan: makeSpan(this.offsetBase, this.offsetBase),
      });
    }

    const node = this.parseEquationSystemOrRelation();
    this.skipWhitespace();
    if (this.pos < this.src.length) {
      const leftover = this.src.slice(this.pos);
      this.diagnostics.push({
        level: 'warning',
        code: 'TRAILING_TOKENS',
        message: `Unparsed trailing tokens: "${leftover}"`,
        span: makeSpan(this.offsetBase + this.pos, this.offsetBase + this.src.length),
      });
    }
    return node;
  }

  private parseEquationSystemOrRelation(): AstNode {
    this.skipWhitespace();
    // Equation system in curly braces: {x+y=5, x-y=1}
    if (this.peek() === '{') {
      const start = this.pos;
      const group = readBalancedGroup(this.src, this.pos, '{', '}');
      if (group) {
        this.pos = group.endPos;
        const innerStart = start + 1;
        const eqSegments = splitTopLevelArgs(group.content, this.offsetBase + innerStart);
        const eqNodes = eqSegments.map((seg) => this.parseSub(seg.text, seg.start));
        return createNode('equation_system', {
          children: eqNodes,
          slots: { equations: eqNodes },
          representation: 'linear',
          raw: this.src.slice(start, this.pos),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { equationCount: eqNodes.length },
        });
      }
    }

    const start = this.pos;
    let left = this.parseAddSub();
    this.skipWhitespace();

    // Check relation operators: =, !=, <=, >=, <, >, \ne, \le, \ge
    const relMatch = this.matchRelationOp();
    if (relMatch) {
      const right = this.parseAddSub();
      return createNode('relation', {
        operator: relMatch,
        children: [left, right],
        slots: { left, right },
        representation: 'linear',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }

    return left;
  }

  private matchRelationOp(): string | null {
    this.skipWhitespace();
    const ops = ['!=', '<=', '>=', '\\ne', '\\neq', '\\le', '\\ge', '=', '<', '>'];
    for (const op of ops) {
      if (this.startsWith(op)) {
        // Ensure we don't match '->' or similar
        if (op === '=' && this.src[this.pos + 1] === '>') continue;
        this.pos += op.length;
        return op === '\\ne' || op === '\\neq'
          ? '!='
          : op === '\\le'
          ? '<='
          : op === '\\ge'
          ? '>='
          : op;
      }
    }
    return null;
  }

  private parseAddSub(): AstNode {
    const start = this.pos;
    let left = this.parseMulDiv();

    while (true) {
      this.skipWhitespace();
      const ch = this.peek();
      if (ch === '+' || ch === '-') {
        // Guard against '->'
        if (ch === '-' && this.peek(1) === '>') break;
        this.pos++;
        const right = this.parseMulDiv();
        left = createNode('binary', {
          operator: ch,
          children: [left, right],
          representation: 'linear',
          raw: this.src.slice(start, this.pos).trim(),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
      } else {
        break;
      }
    }

    return left;
  }

  private parseMulDiv(): AstNode {
    const start = this.pos;
    let left = this.parseUnary();

    while (true) {
      this.skipWhitespace();
      const ch = this.peek();

      if (ch === '*' || this.startsWith('\\cdot') || this.startsWith('\\times')) {
        const opLen = ch === '*' ? 1 : this.startsWith('\\cdot') ? 5 : 6;
        this.pos += opLen;
        const right = this.parseUnary();
        left = createNode('binary', {
          operator: '*',
          children: [left, right],
          representation: 'linear',
          raw: this.src.slice(start, this.pos).trim(),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
      } else if (ch === '/') {
        this.pos++;
        const right = this.parseUnary();
        this.skipWhitespace();
        if (right.kind !== 'group' && this.canStartImplicitMultiplication(right)) {
          this.diagnostics.push({
            level: 'info',
            code: 'AMBIGUOUS_DIVISION_WITH_IMPLICIT_MULTIPLICATION',
            message:
              'Division followed by implicit multiplication (e.g. 1/2x) is parsed left-to-right as (1/2)*x; add parentheses to disambiguate.',
            span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }
        // Rule 3 & 4:
        // If either numerator or denominator is explicitly grouped with parentheses (e.g. (a+b)/(c-d)),
        // represent as compositional 'fraction' (representation: 'linear').
        // Plain atomic linear division a/b stays 'binary' with operator '/'.
        if (left.kind === 'group' || right.kind === 'group') {
          left = createNode('fraction', {
            children: [left, right],
            slots: { numerator: left, denominator: right },
            representation: 'linear',
            raw: this.src.slice(start, this.pos).trim(),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        } else {
          left = createNode('binary', {
            operator: '/',
            children: [left, right],
            representation: 'linear',
            raw: this.src.slice(start, this.pos).trim(),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }
      } else if (this.canStartImplicitMultiplication(left)) {
        const right = this.parseUnary();
        left = createNode('binary', {
          operator: '*',
          children: [left, right],
          representation: 'linear',
          raw: this.src.slice(start, this.pos).trim(),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { implicit: true },
        });
      } else {
        break;
      }
    }

    return left;
  }

  private canStartImplicitMultiplication(prev: AstNode): boolean {
    if (this.pos >= this.src.length) return false;
    const ch = this.peek();
    // Don't implicitly multiply across closing delimiters, operators, commas, or pipe closing
    if (
      ch === ')' || ch === ']' || ch === '}' || ch === '|' ||
      ch === ',' || ch === ';' || ch === '+' || ch === '-' ||
      ch === '*' || ch === '/' || ch === '^' || ch === '=' ||
      ch === '<' || ch === '>' || ch === '&' || ch === '\\' && (this.startsWith('\\\\') || this.startsWith('\\end') || this.startsWith('\\right'))
    ) {
      // Wait: \frac, \sqrt, \sin can start implicit multiplication like 2\sin(x) or a\frac{b}{c}!
      if (ch === '\\' && !this.startsWith('\\\\') && !this.startsWith('\\end') && !this.startsWith('\\right') && !this.startsWith('\\ne') && !this.startsWith('\\le') && !this.startsWith('\\ge')) {
        return true;
      }
      return false;
    }

    if (
      prev.kind === 'constant' ||
      prev.kind === 'constant_ref' ||
      prev.kind === 'group' ||
      prev.kind === 'fraction' ||
      prev.kind === 'radical' ||
      prev.kind === 'absolute' ||
      prev.kind === 'variable' ||
      prev.kind === 'function' ||
      prev.kind === 'binary'
    ) {
      if (
        ch === '(' ||
        ch === '\\' ||
        ch === 'π' ||
        ch === 'φ' ||
        ch === '√' ||
        /[a-zA-Z]/.test(ch)
      ) {
        return true;
      }
    }
    return false;
  }

  private parseUnary(): AstNode {
    this.skipWhitespace();
    const start = this.pos;
    if (this.peek() === '-' && this.peek(1) !== '>') {
      this.pos++;
      const operand = this.parseUnary();
      return createNode('unary', {
        operator: '-',
        children: [operand],
        representation: 'linear',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }
    if (this.peek() === '+') {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parseExponentArg(): AstNode {
    this.skipWhitespace();
    if (this.peek() === '{') {
      const grp = readBalancedGroup(this.src, this.pos, '{', '}');
      if (grp) {
        const exponent = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
        this.pos = grp.endPos;
        return exponent;
      }
    }
    return this.parseUnary();
  }

  private parsePower(): AstNode {
    const start = this.pos;
    const base = this.parsePostfixPrimary();
    this.skipWhitespace();
    if (this.peek() === '^') {
      this.pos++;
      const exponent = this.parseExponentArg();
      return createNode('binary', {
        operator: '^',
        children: [base, exponent],
        representation: 'linear',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }
    return base;
  }

  private parsePostfixPrimary(): AstNode {
    this.skipWhitespace();
    const start = this.pos;
    const ch = this.peek();

    // 1. LaTeX commands
    if (ch === '\\') {
      return this.parseLatexConstruct();
    }

    // 2. Parenthesized group (...)
    if (ch === '(') {
      const grp = readBalancedGroup(this.src, this.pos, '(', ')');
      if (grp) {
        const inner = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
        this.pos = grp.endPos;
        return createNode('group', {
          children: [inner],
          slots: { body: inner },
          representation: 'linear',
          raw: this.src.slice(start, this.pos),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
      }
    }

    // 3. Matrix in brackets: [[a,b],[c,d]]
    if (ch === '[') {
      const mat = this.tryParseBracketMatrix();
      if (mat) return mat;
    }

    // 4. Absolute value: |expr|
    if (ch === '|') {
      const absNode = this.tryParseAbsoluteValue();
      if (absNode) return absNode;
    }

    // 5. Unicode Mathematical Constants (π, φ) and Radical Symbol (√)
    if (ch === 'π') {
      this.pos++;
      if (
        this.context.declaredVariables?.includes('π') ||
        this.context.declaredVariables?.includes('pi') ||
        this.boundVariables.has('π') ||
        this.boundVariables.has('pi')
      ) {
        return createNode('variable', {
          value: 'π',
          raw: 'π',
          representation: 'linear',
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { symbol: true },
        });
      }
      return this.makeConstantRefNode('MATH_CONST_PI', 'π', start, this.pos);
    }
    if (ch === 'φ') {
      this.pos++;
      if (
        this.context.declaredVariables?.includes('φ') ||
        this.context.declaredVariables?.includes('phi') ||
        this.boundVariables.has('φ') ||
        this.boundVariables.has('phi')
      ) {
        return createNode('variable', {
          value: 'φ',
          raw: 'φ',
          representation: 'linear',
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { symbol: true },
        });
      }
      return this.makeConstantRefNode('MATH_CONST_PHI', 'φ', start, this.pos);
    }
    if (ch === '√') {
      this.pos++;
      this.skipWhitespace();
      let indexNode: AstNode | undefined;
      if (this.peek() === '[') {
        const idxGrp = readBalancedGroup(this.src, this.pos, '[', ']');
        if (idxGrp) {
          indexNode = this.parseSub(idxGrp.content, this.offsetBase + this.pos + 1);
          this.pos = idxGrp.endPos;
          this.skipWhitespace();
        } else {
          this.diagnostics.push({
            level: 'error',
            code: 'INVALID_RADICAL',
            message: 'Unclosed "[" for radical index after √.',
            span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos + 1),
          });
          this.pos++;
          return createNode('unknown', {
            value: '√[',
            raw: this.src.slice(start, this.pos),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }
      }
      let radNode: AstNode;
      if (this.peek() === '{') {
        const grp = readBalancedGroup(this.src, this.pos, '{', '}');
        if (grp) {
          radNode = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
          this.pos = grp.endPos;
        } else {
          this.diagnostics.push({
            level: 'error',
            code: 'INVALID_RADICAL',
            message: 'Unclosed "{" for radical radicand after √.',
            span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos + 1),
          });
          this.pos++;
          return createNode('unknown', {
            value: '√{',
            raw: this.src.slice(start, this.pos),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }
      } else {
        radNode = this.parsePostfixPrimary();
      }
      const slots: Record<string, AstNode> = { radicand: radNode };
      const children: AstNode[] = [radNode];
      if (indexNode) {
        slots.index = indexNode;
        children.unshift(indexNode);
      }
      return createNode('radical', {
        children,
        slots,
        representation: 'linear',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: {
          indexSource: !indexNode
            ? 'implicit_default'
            : indexNode.kind === 'constant' ||
              (indexNode.kind === 'unary' &&
                indexNode.operator === '-' &&
                indexNode.children[0]?.kind === 'constant')
            ? 'explicit'
            : 'symbolic',
        },
      });
    }

    // 6. Numeric Constant (with NUMERIC_SPECIAL metadata for 0 and 1)
    if (/[0-9]/.test(ch)) {
      let end = this.pos;
      while (end < this.src.length && /[0-9.]/.test(this.src[end])) {
        end++;
      }
      const val = this.src.slice(this.pos, end);
      this.pos = end;
      const numSpecial = lookupNumericSpecial(val);
      return createNode('constant', {
        value: val,
        raw: val,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + end),
        ...(numSpecial ? { metadata: { numericSpecialId: numSpecial.constantId } } : {}),
      });
    }

    // 7. Identifiers, Functions, Constants, and Textual Compositional Constructs
    if (/[a-zA-Z]/.test(ch)) {
      return this.parseIdentifierOrConstruct();
    }

    // Fallback unknown character
    this.pos++;
    const bad = ch || '';
    this.diagnostics.push({
      level: 'warning',
      code: 'UNEXPECTED_TOKEN',
      message: `Unexpected symbol "${bad}" at position ${this.offsetBase + start}`,
      span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
    });
    return createNode('unknown', {
      value: bad,
      raw: bad,
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
    });
  }

  private tryParseAbsoluteValue(): AstNode | null {
    const start = this.pos;
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    let absDepth = 1;
    let closeIdx = -1;
    let prevNonSpace = '|';

    for (let i = start + 1; i < this.src.length; i++) {
      const c = this.src[i];
      if (c === '(') paren++;
      else if (c === ')') paren = Math.max(0, paren - 1);
      else if (c === '{') brace++;
      else if (c === '}') brace = Math.max(0, brace - 1);
      else if (c === '[') bracket++;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      else if (c === '|' && paren === 0 && brace === 0 && bracket === 0) {
        // Determine whether this '|' opens a nested absolute value or closes an open one
        const opensNested =
          prevNonSpace === '|' ||
          prevNonSpace === '+' ||
          prevNonSpace === '-' ||
          prevNonSpace === '*' ||
          prevNonSpace === '/' ||
          prevNonSpace === '^' ||
          prevNonSpace === '=' ||
          prevNonSpace === '<' ||
          prevNonSpace === '>' ||
          prevNonSpace === ',' ||
          prevNonSpace === '(' ||
          prevNonSpace === '[' ||
          prevNonSpace === '{';

        if (opensNested) {
          absDepth++;
        } else {
          absDepth--;
          if (absDepth === 0) {
            closeIdx = i;
            break;
          }
        }
      }
      if (!/\s/.test(c)) {
        // Distinguish an opening '|' from a closing '|' for subsequent bars
        if (c === '|' && absDepth > 0) {
          prevNonSpace = prevNonSpace === '+' || prevNonSpace === '-' || prevNonSpace === '*' || prevNonSpace === '/' || prevNonSpace === '(' ? '|' : ')';
        } else {
          prevNonSpace = c;
        }
      }
    }

    if (closeIdx === -1) {
      this.diagnostics.push({
        level: 'error',
        code: 'UNCLOSED_ABSOLUTE',
        message: 'Unclosed vertical bar "|" for absolute value.',
        span: makeSpan(this.offsetBase + start, this.offsetBase + start + 1),
      });
      this.pos++;
      return createNode('unknown', { value: '|', raw: '|' });
    }

    const innerStr = this.src.slice(start + 1, closeIdx);
    const operand = this.parseSub(innerStr, this.offsetBase + start + 1);
    this.pos = closeIdx + 1;

    return createNode('absolute', {
      children: [operand],
      slots: { operand },
      representation: 'linear',
      raw: this.src.slice(start, this.pos),
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      metadata: {
        contextAmbiguity: 'absolute_or_norm',
      },
    });
  }

  private tryParseBracketMatrix(): AstNode | null {
    const start = this.pos;
    const outer = readBalancedGroup(this.src, this.pos, '[', ']');
    if (!outer) return null;

    const trimmed = outer.content.trim();
    if (!trimmed.startsWith('[')) {
      return null;
    }

    this.pos = outer.endPos;
    const rowSegs = splitTopLevelArgs(outer.content, this.offsetBase + start + 1);
    const rowNodes: AstNode[] = [];
    const allElements: AstNode[] = [];
    let cols = 0;

    for (const rSeg of rowSegs) {
      const rTrim = rSeg.text.trim();
      if (rTrim.startsWith('[') && rTrim.endsWith(']')) {
        const innerContent = rTrim.slice(1, -1);
        const elemSegs = splitTopLevelArgs(innerContent, rSeg.start + 1);
        const elemNodes = elemSegs.map((e) => this.parseSub(e.text, e.start));
        cols = Math.max(cols, elemNodes.length);
        allElements.push(...elemNodes);
        rowNodes.push(
          createNode('group', {
            children: elemNodes,
            raw: rTrim,
            sourceSpan: makeSpan(rSeg.start, rSeg.end),
          })
        );
      }
    }

    return createNode('matrix', {
      children: rowNodes,
      slots: { rows: rowNodes, elements: allElements },
      representation: 'linear',
      raw: this.src.slice(start, this.pos),
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      metadata: {
        rows: rowNodes.length,
        cols,
        dimension: `${rowNodes.length}x${cols}`,
      },
    });
  }

  private parseIdentifierOrConstruct(): AstNode {
    const start = this.pos;

    // Read alphabetic prefix
    let end = this.pos;
    while (end < this.src.length && /[a-zA-Z]/.test(this.src[end])) {
      end++;
    }
    const word = this.src.slice(this.pos, end);

    // 1. Subscripted variable or explicit underscored constant alias (e.g. a_i, e_1, EULER_NUMBER)
    if (this.src[end] === '_') {
      let subEnd = end + 1;
      if (this.src[subEnd] === '{') {
        const grp = readBalancedGroup(this.src, subEnd, '{', '}');
        if (grp) subEnd = grp.endPos;
      } else {
        while (subEnd < this.src.length && /[a-zA-Z0-9_]/.test(this.src[subEnd])) {
          subEnd++;
        }
      }
      const fullVar = this.src.slice(start, subEnd);
      this.pos = subEnd;
      if (fullVar === 'EULER_NUMBER' || fullVar === 'imaginary_unit') {
        const reg = lookupConstantByAlias(fullVar);
        if (reg) {
          return this.makeConstantRefNode(reg.constantId, fullVar, start, subEnd);
        }
      }
      return createNode('variable', {
        value: fullVar,
        raw: fullVar,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + subEnd),
      });
    }

    // 2. Variable with numeric suffix (e.g. x1, x2, x10, a12)
    // Pure alphabetic runs without digits like "ab" or "cd" continue to split via implicit multiplication.
    if (end < this.src.length && /[0-9]/.test(this.src[end]) && !KNOWN_FUNCTIONS.has(word)) {
      let numEnd = end;
      while (numEnd < this.src.length && /[a-zA-Z0-9]/.test(this.src[numEnd])) {
        numEnd++;
      }
      const fullIdent = this.src.slice(start, numEnd);
      this.pos = numEnd;
      return createNode('variable', {
        value: fullIdent,
        raw: fullIdent,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + numEnd),
      });
    }

    // 3. Reserved compositional constructs & declared/ambiguous function calls
    let lookahead = end;
    while (lookahead < this.src.length && /\s/.test(this.src[lookahead])) {
      lookahead++;
    }

    const lower = word.toLowerCase();
    const isReservedConstruct =
      lower === 'det' ||
      lower === 'sqrt' ||
      lower === 'abs' ||
      lower === 'sum' ||
      lower === 'prod' ||
      lower === 'int' ||
      lower === 'lim';

    if (this.src[lookahead] === '(' && (isReservedConstruct || !KNOWN_FUNCTIONS.has(word))) {
      // Check explicit user variable declaration for function-vs-multiplication disambiguation
      if (
        !isReservedConstruct &&
        this.context.declaredVariables?.includes(word)
      ) {
        this.pos = end;
        return createNode('variable', {
          value: word,
          raw: word,
          representation: 'linear',
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + end),
        });
      }

      const grp = readBalancedGroup(this.src, lookahead, '(', ')');
      if (grp) {
        const argBase = this.offsetBase + lookahead + 1;
        this.pos = grp.endPos;

        if (lower === 'det') {
          const args = splitTopLevelArgs(grp.content, argBase);
          const target = args[0] ? this.parseSub(args[0].text, args[0].start) : createNode('unknown', { value: '' });
          return createNode('determinant', {
            children: [target],
            slots: { target },
            representation: 'linear',
            raw: this.src.slice(start, this.pos),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
            metadata: {
              dimension: null,
              squarenessVerified: false,
            },
          });
        }

        if (lower === 'sqrt') {
          const args = splitTopLevelArgs(grp.content, argBase);
          const radicand = args[0] ? this.parseSub(args[0].text, args[0].start) : createNode('unknown', { value: '' });
          return createNode('radical', {
            children: [radicand],
            slots: { radicand },
            representation: 'linear',
            raw: this.src.slice(start, this.pos),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
            metadata: { indexSource: 'implicit_default' },
          });
        }

        if (lower === 'abs') {
          const args = splitTopLevelArgs(grp.content, argBase);
          const operand = args[0] ? this.parseSub(args[0].text, args[0].start) : createNode('unknown', { value: '' });
          return createNode('absolute', {
            children: [operand],
            slots: { operand },
            representation: 'linear',
            raw: this.src.slice(start, this.pos),
            sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }

        if (lower === 'sum' || lower === 'prod') {
          return this.buildIndexedConstruct(
            lower === 'sum' ? 'indexed_sum' : 'indexed_product',
            grp.content,
            argBase,
            start
          );
        }

        if (lower === 'int') {
          return this.buildLinearIntegral(grp.content, argBase, start);
        }

        if (lower === 'lim') {
          return this.buildLinearLimit(grp.content, argBase, start);
        }

        if (!this.context.declaredFunctions?.includes(word)) {
          this.diagnostics.push({
            level: 'info',
            code: 'AMBIGUOUS_FUNCTION_OR_MULTIPLICATION',
            message: `Identifier "${word}" followed by (...) is not in KNOWN_FUNCTIONS or declaredFunctions; parsed provisionally as function call rather than "${word} * (...)".`,
            span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          });
        }

        const args = splitTopLevelArgs(grp.content, argBase).map((a) =>
          this.parseSub(a.text, a.start)
        );
        return createNode('function', {
          value: word,
          children: args,
          slots: { arguments: args },
          representation: 'linear',
          raw: this.src.slice(start, this.pos),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
      }
    }

    // 4. Known functions (with optional ^{k} or ^k, and with or without parentheses e.g. sin x)
    if (KNOWN_FUNCTIONS.has(word)) {
      this.pos = end;
      let powerNode: AstNode | null = null;
      if (this.peek() === '^') {
        this.pos++;
        powerNode = this.parseExponentArg();
      }
      this.skipWhitespace();
      let args: AstNode[] = [];
      const isLogFn = word === 'ln' || word === 'log';
      if (this.peek() === '(') {
        const grp = readBalancedGroup(this.src, this.pos, '(', ')');
        if (grp) {
          args = splitTopLevelArgs(grp.content, this.offsetBase + this.pos + 1).map((a) =>
            this.parseSub(a.text, a.start, undefined, isLogFn && a.text.trim() === 'e')
          );
          this.pos = grp.endPos;
        }
      } else if (this.pos < this.src.length && /[a-zA-Z0-9\\(|πφ√]/.test(this.peek())) {
        args = [this.parsePower()];
      }

      const fnNode = createNode('function', {
        value: word,
        children: args,
        slots: { arguments: args },
        representation: 'linear',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
      if (powerNode) {
        return createNode('binary', {
          operator: '^',
          children: [fnNode, powerNode],
          representation: 'linear',
          raw: this.src.slice(start, this.pos).trim(),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { functionPower: true },
        });
      }
      return fnNode;
    }

    // 5. Registered Constant Aliases (pi, phi) & Known Symbols (theta, alpha, ...)
    const isDeclaredOrBoundPi =
      word === 'pi' &&
      (this.context.declaredVariables?.includes('pi') ||
        this.context.declaredVariables?.includes('π') ||
        this.boundVariables.has('pi') ||
        this.boundVariables.has('π'));
    const isDeclaredOrBoundPhi =
      word === 'phi' &&
      (this.context.declaredVariables?.includes('phi') ||
        this.context.declaredVariables?.includes('φ') ||
        this.boundVariables.has('phi') ||
        this.boundVariables.has('φ'));
    if ((word === 'pi' && !isDeclaredOrBoundPi) || (word === 'phi' && !isDeclaredOrBoundPhi)) {
      const reg = lookupConstantByAlias(word);
      if (reg) {
        this.pos = end;
        return this.makeConstantRefNode(reg.constantId, word, start, end);
      }
    }

    if (KNOWN_SYMBOLS.has(word)) {
      this.pos = end;
      return createNode('variable', {
        value: word,
        raw: word,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + end),
        metadata: { symbol: true },
      });
    }

    // 6. Single letter: contextual constant recognition ('e', 'i') or variable
    const firstChar = this.src[start];
    this.pos = start + 1;

    if (firstChar === 'e') {
      let look = this.pos;
      while (look < this.src.length && /\s/.test(this.src[look])) look++;
      const hasExponent = this.src[look] === '^';
      const isDeclaredVar =
        this.context.declaredVariables?.includes('e') || this.boundVariables.has('e');
      const isDeclaredConst = this.context.declaredConstants?.includes('e');

      if (!isDeclaredVar && (hasExponent || isDeclaredConst || this.inLogContext)) {
        return this.makeConstantRefNode('MATH_CONST_E', 'e', start, start + 1);
      }
      if (!isDeclaredVar) {
        this.diagnostics.push({
          level: 'info',
          code: 'AMBIGUOUS_CONSTANT_OR_VARIABLE',
          message:
            'Lowercase "e" without exponent (e.g. "2e", "a*e") is ambiguous between Euler number (MATH_CONST_E) and a variable; treated conservatively as variable unless written as e^x, ln(e), or declared.',
          span: makeSpan(this.offsetBase + start, this.offsetBase + start + 1),
        });
      }
    }

    if (firstChar === 'i') {
      const isDeclaredVar =
        this.context.declaredVariables?.includes('i') || this.boundVariables.has('i');
      const isDeclaredConst = this.context.declaredConstants?.includes('i');
      const trimmedSrc = this.src.trim();
      const isImaginaryIdentity =
        /^\s*i\s*\^\s*2\s*=\s*-\s*1\s*$/.test(trimmedSrc) ||
        /^-\s*1\s*=\s*i\s*\^\s*2\s*$/.test(trimmedSrc) ||
        /^\s*i\s*\^\s*2\s*\+\s*1\s*=\s*0\s*$/.test(trimmedSrc);
      const hasComplexDomain = this.context.numberDomain === 'COMPLEX';

      if (!isDeclaredVar && (hasComplexDomain || isDeclaredConst || isImaginaryIdentity)) {
        return this.makeConstantRefNode('MATH_CONST_I', 'i', start, start + 1);
      }
      if (!isDeclaredVar) {
        this.diagnostics.push({
          level: 'info',
          code: 'AMBIGUOUS_CONSTANT_OR_VARIABLE',
          message:
            'Lowercase "i" without COMPLEX numberDomain or explicit imaginary-unit context is ambiguous between imaginary unit (MATH_CONST_I) and a variable; treated conservatively as variable.',
          span: makeSpan(this.offsetBase + start, this.offsetBase + start + 1),
        });
      }
    }

    return createNode('variable', {
      value: firstChar,
      raw: firstChar,
      representation: 'linear',
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + start + 1),
    });
  }

  private buildIndexedConstruct(
    kind: 'indexed_sum' | 'indexed_product',
    content: string,
    argBase: number,
    start: number
  ): AstNode {
    const args = splitTopLevelArgs(content, argBase);
    // Expected form: sum(i=1..n, a_i) or sum(i, 1, n, a_i)
    let indexNode: AstNode = createNode('unknown', { value: 'i' });
    let lowerNode: AstNode = createNode('unknown', { value: '1' });
    let upperNode: AstNode = createNode('unknown', { value: 'n' });
    let bodyNode: AstNode = createNode('unknown', { value: '' });

    if (args.length === 2 && args[0].text.includes('..')) {
      const rangeParts = args[0].text.split('..');
      const lhs = rangeParts[0].trim();
      const rhs = rangeParts[1].trim();
      if (lhs.includes('=')) {
        const [idxName, lowStr] = lhs.split('=');
        const boundName = idxName.trim();
        const idxExtra = boundName ? [boundName] : undefined;
        indexNode = this.parseSub(boundName, args[0].start, idxExtra);
        lowerNode = this.parseSub(lowStr.trim(), args[0].start + lhs.indexOf('=') + 1);
        upperNode = this.parseSub(rhs, args[0].start + args[0].text.indexOf('..') + 2);
        const bodyExtra = this.resolveBinderNames(boundName, indexNode);
        bodyNode = this.parseSub(args[1].text, args[1].start, bodyExtra);
      } else {
        lowerNode = this.parseSub(lhs, args[0].start);
        upperNode = this.parseSub(rhs, args[0].start + args[0].text.indexOf('..') + 2);
        bodyNode = this.parseSub(args[1].text, args[1].start);
      }
    } else if (args.length === 4) {
      const boundName = args[0].text.trim();
      const idxExtra = boundName ? [boundName] : undefined;
      indexNode = this.parseSub(args[0].text, args[0].start, idxExtra);
      lowerNode = this.parseSub(args[1].text, args[1].start);
      upperNode = this.parseSub(args[2].text, args[2].start);
      const bodyExtra = this.resolveBinderNames(boundName, indexNode);
      bodyNode = this.parseSub(args[3].text, args[3].start, bodyExtra);
    } else if (args.length > 0) {
      bodyNode = this.parseSub(args[args.length - 1].text, args[args.length - 1].start);
    }

    return createNode(kind, {
      children: [indexNode, lowerNode, upperNode, bodyNode],
      slots: {
        index: indexNode,
        lowerBound: lowerNode,
        upperBound: upperNode,
        body: bodyNode,
      },
      representation: 'linear',
      raw: this.src.slice(start, this.pos),
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
    });
  }

  private buildLinearIntegral(content: string, argBase: number, start: number): AstNode {
    const args = splitTopLevelArgs(content, argBase);
    // int(a, b, f(x), x) -> definite | int(f(x), x) -> indefinite
    if (args.length === 4) {
      const varRaw = args[3].text.trim();
      const variable = this.parseSub(args[3].text, args[3].start, varRaw ? [varRaw] : undefined);
      const lowerBound = this.parseSub(args[0].text, args[0].start);
      const upperBound = this.parseSub(args[1].text, args[1].start);
      const integrandExtra = this.resolveBinderNames(varRaw, variable);
      const integrand = this.parseSub(args[2].text, args[2].start, integrandExtra);
      return createNode('integral', {
        children: [lowerBound, upperBound, integrand, variable],
        slots: { lowerBound, upperBound, integrand, variable },
        representation: 'linear',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: { definite: true },
      });
    }

    const varRaw = args[1] ? args[1].text.trim() : '';
    const variable = args[1]
      ? this.parseSub(args[1].text, args[1].start, varRaw ? [varRaw] : undefined)
      : createNode('variable', { value: 'x' });
    const integrandExtra = args[1] ? this.resolveBinderNames(varRaw, variable) : undefined;
    const integrand = args[0]
      ? this.parseSub(args[0].text, args[0].start, integrandExtra)
      : createNode('unknown', { value: '' });
    return createNode('integral', {
      children: [integrand, variable],
      slots: { integrand, variable },
      representation: 'linear',
      raw: this.src.slice(start, this.pos),
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      metadata: { definite: false },
    });
  }

  private buildLinearLimit(content: string, argBase: number, start: number): AstNode {
    const args = splitTopLevelArgs(content, argBase);
    // lim(x->a, f(x)) or lim(x->a+, f(x))
    let variable: AstNode = createNode('variable', { value: 'x' });
    let approach: AstNode = createNode('unknown', { value: '' });
    let direction: string | undefined;
    let body: AstNode = createNode('unknown', { value: '' });
    let bodyExtra: string[] | undefined;

    if (args[0] && args[0].text.includes('->')) {
      const [varPart, targetPartRaw] = args[0].text.split('->');
      const varRaw = varPart.trim();
      variable = this.parseSub(varRaw, args[0].start, varRaw ? [varRaw] : undefined);
      bodyExtra = this.resolveBinderNames(varRaw, variable);
      let targetStr = targetPartRaw.trim();
      if (targetStr.endsWith('+') || targetStr.endsWith('-')) {
        direction = targetStr.slice(-1);
        targetStr = targetStr.slice(0, -1).trim();
      }
      approach = this.parseSub(targetStr, args[0].start + args[0].text.indexOf('->') + 2);
    }

    if (args[1]) {
      body = this.parseSub(args[1].text, args[1].start, bodyExtra);
    }

    const slots: Record<string, AstNode> = { variable, approach, body };
    if (direction) {
      slots.direction = createNode('constant', { value: direction, raw: direction });
    }

    return createNode('limit', {
      children: [variable, approach, body],
      slots,
      representation: 'linear',
      raw: this.src.slice(start, this.pos),
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      ...(direction ? { metadata: { direction } } : {}),
    });
  }

  private parseLatexConstruct(): AstNode {
    const start = this.pos;
    this.pos++; // skip '\'
    let cmdEnd = this.pos;
    while (cmdEnd < this.src.length && /[a-zA-Z]/.test(this.src[cmdEnd])) {
      cmdEnd++;
    }
    const cmd = this.src.slice(this.pos, cmdEnd);
    this.pos = cmdEnd;
    this.skipWhitespace();

    // \frac{numerator}{denominator}
    if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
      const numGrp = readBalancedGroup(this.src, this.pos, '{', '}');
      if (!numGrp) {
        this.diagnostics.push({
          level: 'error',
          code: 'INVALID_FRAC',
          message: 'Expected {numerator} after \\frac',
          span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
        return createNode('unknown', { value: '\\frac', raw: '\\frac' });
      }
      const numNode = this.parseSub(numGrp.content, this.offsetBase + this.pos + 1);
      this.pos = numGrp.endPos;
      this.skipWhitespace();

      const denGrp = readBalancedGroup(this.src, this.pos, '{', '}');
      if (!denGrp) {
        this.diagnostics.push({
          level: 'error',
          code: 'INVALID_FRAC',
          message: 'Expected {denominator} after \\frac{numerator}',
          span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
        return createNode('unknown', { value: '\\frac', raw: this.src.slice(start, this.pos) });
      }
      const denNode = this.parseSub(denGrp.content, this.offsetBase + this.pos + 1);
      this.pos = denGrp.endPos;

      return createNode('fraction', {
        children: [numNode, denNode],
        slots: { numerator: numNode, denominator: denNode },
        representation: 'stacked',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }

    // \sqrt[n]{x} or \sqrt{x}
    if (cmd === 'sqrt') {
      let indexNode: AstNode | undefined;
      if (this.peek() === '[') {
        const idxGrp = readBalancedGroup(this.src, this.pos, '[', ']');
        if (idxGrp) {
          indexNode = this.parseSub(idxGrp.content, this.offsetBase + this.pos + 1);
          this.pos = idxGrp.endPos;
          this.skipWhitespace();
        }
      }
      const radGrp = readBalancedGroup(this.src, this.pos, '{', '}');
      if (!radGrp) {
        this.diagnostics.push({
          level: 'error',
          code: 'INVALID_RADICAL',
          message: 'Expected {radicand} after \\sqrt',
          span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        });
        return createNode('unknown', { value: '\\sqrt' });
      }
      const radicandNode = this.parseSub(radGrp.content, this.offsetBase + this.pos + 1);
      this.pos = radGrp.endPos;

      const slots: Record<string, AstNode> = { radicand: radicandNode };
      const children: AstNode[] = [radicandNode];
      if (indexNode) {
        slots.index = indexNode;
        children.unshift(indexNode);
      }

      return createNode('radical', {
        children,
        slots,
        representation: 'stacked',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: {
          indexSource: !indexNode
            ? 'implicit_default'
            : indexNode.kind === 'constant'
            ? 'explicit'
            : 'symbolic',
        },
      });
    }

    // \left| ... \right| with nested delimiter tracking
    if (cmd === 'left' && this.peek() === '|') {
      this.pos++; // skip '|'
      let depth = 1;
      let scan = this.pos;
      let closePos = -1;
      while (scan < this.src.length) {
        if (this.src.startsWith('\\left|', scan)) {
          depth++;
          scan += '\\left|'.length;
        } else if (this.src.startsWith('\\right|', scan)) {
          depth--;
          if (depth === 0) {
            closePos = scan;
            break;
          }
          scan += '\\right|'.length;
        } else {
          scan++;
        }
      }
      if (closePos !== -1) {
        const innerStr = this.src.slice(this.pos, closePos);
        const operand = this.parseSub(innerStr, this.offsetBase + this.pos);
        this.pos = closePos + '\\right|'.length;
        return createNode('absolute', {
          children: [operand],
          slots: { operand },
          representation: 'linear',
          raw: this.src.slice(start, this.pos),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { contextAmbiguity: 'absolute_or_norm' },
        });
      }
      this.diagnostics.push({
        level: 'error',
        code: 'UNCLOSED_ABSOLUTE',
        message: 'Missing matching \\right| for \\left|.',
        span: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
      return createNode('unknown', { value: '\\left|', raw: '\\left|' });
    }

    // \begin{pmatrix|bmatrix|vmatrix|cases} ... \end{...}
    if (cmd === 'begin') {
      const envGrp = readBalancedGroup(this.src, this.pos, '{', '}');
      if (envGrp) {
        const envName = envGrp.content.trim();
        this.pos = envGrp.endPos;
        const endMarker = `\\end{${envName}}`;
        const endIdx = this.src.indexOf(endMarker, this.pos);
        if (endIdx !== -1) {
          const bodyContent = this.src.slice(this.pos, endIdx);
          const bodyStart = this.offsetBase + this.pos;
          this.pos = endIdx + endMarker.length;

          if (envName === 'cases') {
            const rows = splitByDelimiter(bodyContent, '\\\\', bodyStart);
            const eqNodes = rows.map((r) => this.parseSub(r.text, r.start));
            return createNode('equation_system', {
              children: eqNodes,
              slots: { equations: eqNodes },
              representation: 'stacked',
              raw: this.src.slice(start, this.pos),
              sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
              metadata: { equationCount: eqNodes.length },
            });
          }

          if (envName === 'pmatrix' || envName === 'bmatrix' || envName === 'matrix' || envName === 'vmatrix') {
            const rows = splitByDelimiter(bodyContent, '\\\\', bodyStart);
            const rowNodes: AstNode[] = [];
            const allElements: AstNode[] = [];
            let cols = 0;
            for (const r of rows) {
              const cells = splitByDelimiter(r.text, '&', r.start);
              const cellNodes = cells.map((c) => this.parseSub(c.text, c.start));
              cols = Math.max(cols, cellNodes.length);
              allElements.push(...cellNodes);
              rowNodes.push(
                createNode('group', {
                  children: cellNodes,
                  raw: r.text.trim(),
                  sourceSpan: makeSpan(r.start, r.end),
                })
              );
            }
            const isDet = envName === 'vmatrix';
            return createNode(isDet ? 'determinant' : 'matrix', {
              children: rowNodes,
              slots: { rows: rowNodes, elements: allElements },
              representation: 'stacked',
              raw: this.src.slice(start, this.pos),
              sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
              metadata: {
                rows: rowNodes.length,
                cols,
                dimension: `${rowNodes.length}x${cols}`,
                ...(isDet ? { squarenessVerified: rowNodes.length === cols } : {}),
              },
            });
          }
        }
      }
    }

    // \sum_{i=1}^{n} body  or  \prod_{i=1}^{n} body
    if (cmd === 'sum' || cmd === 'prod') {
      let lowerBound: AstNode | undefined;
      let indexNode: AstNode | undefined;
      let upperBound: AstNode | undefined;
      let boundName: string | undefined;

      if (this.peek() === '_') {
        this.pos++;
        const subGrp = readBalancedGroup(this.src, this.pos, '{', '}');
        if (subGrp) {
          if (subGrp.content.includes('=')) {
            const eqIdx = subGrp.content.indexOf('=');
            const idxText = subGrp.content.slice(0, eqIdx);
            const lowText = subGrp.content.slice(eqIdx + 1);
            boundName = idxText.trim();
            const extra = boundName ? [boundName] : undefined;
            indexNode = this.parseSub(idxText, this.offsetBase + this.pos + 1, extra);
            lowerBound = this.parseSub(lowText, this.offsetBase + this.pos + 1 + eqIdx + 1);
          } else {
            lowerBound = this.parseSub(subGrp.content, this.offsetBase + this.pos + 1);
          }
          this.pos = subGrp.endPos;
          this.skipWhitespace();
        }
      }

      if (this.peek() === '^') {
        this.pos++;
        const supGrp = readBalancedGroup(this.src, this.pos, '{', '}');
        if (supGrp) {
          upperBound = this.parseSub(supGrp.content, this.offsetBase + this.pos + 1);
          this.pos = supGrp.endPos;
          this.skipWhitespace();
        } else {
          upperBound = this.parseUnary();
        }
      }

      const bodyBound = boundName ? this.resolveBinderNames(boundName, indexNode) : [];
      const prevBound = this.boundVariables;
      if (bodyBound.length > 0) {
        this.boundVariables = new Set([...this.boundVariables, ...bodyBound]);
      }
      const body = this.parseAddSub();
      this.boundVariables = prevBound;

      const slots: Record<string, AstNode> = { body };
      if (indexNode) slots.index = indexNode;
      if (lowerBound) slots.lowerBound = lowerBound;
      if (upperBound) slots.upperBound = upperBound;

      return createNode(cmd === 'sum' ? 'indexed_sum' : 'indexed_product', {
        children: Object.values(slots),
        slots,
        representation: 'stacked',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }

    // \int_a^b f(x)\,dx or \int f(x) dx
    if (cmd === 'int') {
      let lowerBound: AstNode | undefined;
      let upperBound: AstNode | undefined;
      if (this.peek() === '_') {
        this.pos++;
        if (this.peek() === '{') {
          const grp = readBalancedGroup(this.src, this.pos, '{', '}');
          if (grp) {
            lowerBound = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
            this.pos = grp.endPos;
          }
        } else if (this.peek() === '-') {
          const negStart = this.pos;
          this.pos++;
          const operand = this.parsePostfixPrimary();
          lowerBound = createNode('unary', {
            operator: '-',
            children: [operand],
            representation: 'linear',
            raw: this.src.slice(negStart, this.pos).trim(),
            sourceSpan: makeSpan(this.offsetBase + negStart, this.offsetBase + this.pos),
          });
        } else {
          lowerBound = this.parsePostfixPrimary();
        }
        this.skipWhitespace();
      }
      if (this.peek() === '^') {
        this.pos++;
        if (this.peek() === '{') {
          const grp = readBalancedGroup(this.src, this.pos, '{', '}');
          if (grp) {
            upperBound = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
            this.pos = grp.endPos;
          }
        } else {
          upperBound = this.parseUnary();
        }
        this.skipWhitespace();
      }
      // Look for differential d<var> inside the integral's own syntactic span (stopping before outer relations/delimiters)
      const rest = this.src.slice(this.pos);
      let paren = 0;
      let brace = 0;
      let bracket = 0;
      let diffStart = -1;
      let diffEnd = -1;
      let diffVar = 'x';

      for (let i = 0; i < rest.length; i++) {
        const c = rest[i];
        if (c === '(') paren++;
        else if (c === ')') {
          if (paren === 0) break;
          paren--;
        } else if (c === '{') brace++;
        else if (c === '}') {
          if (brace === 0) break;
          brace--;
        } else if (c === '[') bracket++;
        else if (c === ']') {
          if (bracket === 0) break;
          bracket--;
        } else if (paren === 0 && brace === 0 && bracket === 0) {
          if (c === '=' || c === '<' || c === '>' || c === ',' || c === ';') {
            break;
          }
          const sub = rest.slice(i);
          const m = sub.match(/^(?:\\,|\\;|\\:|\s)+d([a-zA-Z])(?=$|[\s=<>!,;+\-*\/)^\]}])/);
          if (m) {
            diffStart = i;
            diffEnd = i + m[0].length;
            diffVar = m[1];
            break;
          }
        }
      }

      let integrandNode: AstNode;
      let varNode: AstNode = createNode('variable', { value: 'x' });
      if (diffStart !== -1) {
        const integrandStr = rest.slice(0, diffStart);
        varNode = createNode('variable', { value: diffVar, raw: diffVar });
        integrandNode = this.parseSub(integrandStr, this.offsetBase + this.pos, [diffVar]);
        this.pos += diffEnd;
      } else {
        integrandNode = this.parseAddSub();
      }

      const slots: Record<string, AstNode> = {
        integrand: integrandNode,
        variable: varNode,
      };
      if (lowerBound) slots.lowerBound = lowerBound;
      if (upperBound) slots.upperBound = upperBound;

      return createNode('integral', {
        children: Object.values(slots),
        slots,
        representation: 'stacked',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: { definite: Boolean(lowerBound && upperBound) },
      });
    }

    // \lim_{x \to a} f(x)
    if (cmd === 'lim') {
      let variable: AstNode = createNode('variable', { value: 'x' });
      let approach: AstNode = createNode('unknown', { value: '' });
      let bodyBound: string[] = [];
      if (this.peek() === '_') {
        this.pos++;
        const grp = readBalancedGroup(this.src, this.pos, '{', '}');
        if (grp) {
          const arrowSplit = grp.content.split(/\\to|->/);
          if (arrowSplit.length === 2) {
            const varRaw = arrowSplit[0].trim();
            variable = this.parseSub(varRaw, this.offsetBase + this.pos + 1, varRaw ? [varRaw] : undefined);
            bodyBound = this.resolveBinderNames(varRaw, variable);
            approach = this.parseSub(arrowSplit[1].trim(), this.offsetBase + this.pos + 1);
          }
          this.pos = grp.endPos;
          this.skipWhitespace();
        }
      }
      const prevBound = this.boundVariables;
      if (bodyBound.length > 0) {
        this.boundVariables = new Set([...this.boundVariables, ...bodyBound]);
      }
      const body = this.parseAddSub();
      this.boundVariables = prevBound;
      return createNode('limit', {
        children: [variable, approach, body],
        slots: { variable, approach, body },
        representation: 'stacked',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
    }

    // \det(A)
    if (cmd === 'det') {
      this.skipWhitespace();
      let target: AstNode;
      if (this.peek() === '(') {
        const grp = readBalancedGroup(this.src, this.pos, '(', ')');
        if (grp) {
          target = this.parseSub(grp.content, this.offsetBase + this.pos + 1);
          this.pos = grp.endPos;
        } else {
          target = this.parseUnary();
        }
      } else {
        target = this.parseUnary();
      }
      return createNode('determinant', {
        children: [target],
        slots: { target },
        representation: 'linear',
        raw: this.src.slice(start, this.pos),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: { dimension: null, squarenessVerified: false },
      });
    }

    // LaTeX function like \sin, \cos, \ln (with optional ^{2} / ^2 and with or without parens)
    if (KNOWN_FUNCTIONS.has(cmd)) {
      let powerNode: AstNode | null = null;
      if (this.peek() === '^') {
        this.pos++;
        powerNode = this.parseExponentArg();
      }
      this.skipWhitespace();
      let args: AstNode[] = [];
      const isLogCmd = cmd === 'ln' || cmd === 'log';
      if (this.peek() === '(') {
        const grp = readBalancedGroup(this.src, this.pos, '(', ')');
        if (grp) {
          args = splitTopLevelArgs(grp.content, this.offsetBase + this.pos + 1).map((a) =>
            this.parseSub(a.text, a.start, undefined, isLogCmd && a.text.trim() === 'e')
          );
          this.pos = grp.endPos;
        }
      } else if (this.pos < this.src.length && /[a-zA-Z0-9\\(|πφ√]/.test(this.peek())) {
        args = [this.parsePower()];
      }

      const fnNode = createNode('function', {
        value: cmd,
        children: args,
        slots: { arguments: args },
        representation: 'linear',
        raw: this.src.slice(start, this.pos).trim(),
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
      });
      if (powerNode) {
        return createNode('binary', {
          operator: '^',
          children: [fnNode, powerNode],
          representation: 'linear',
          raw: this.src.slice(start, this.pos).trim(),
          sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
          metadata: { functionPower: true },
        });
      }
      return fnNode;
    }

    // Registered LaTeX constants (\pi, \phi, \varphi)
    if (cmd === 'pi' || cmd === 'phi' || cmd === 'varphi') {
      const latexForm = `\\${cmd}`;
      const baseName = cmd === 'varphi' ? 'phi' : cmd;
      const unicodeForm = cmd === 'pi' ? 'π' : 'φ';
      const isDeclaredOrBound =
        this.context.declaredVariables?.includes(baseName) ||
        this.context.declaredVariables?.includes(latexForm) ||
        this.context.declaredVariables?.includes(unicodeForm) ||
        this.boundVariables.has(baseName) ||
        this.boundVariables.has(latexForm) ||
        this.boundVariables.has(unicodeForm);
      if (!isDeclaredOrBound) {
        const reg = lookupConstantByAlias(latexForm);
        if (reg) {
          return this.makeConstantRefNode(reg.constantId, latexForm, start, this.pos);
        }
      }
      return createNode('variable', {
        value: baseName,
        raw: latexForm,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: { symbol: true },
      });
    }

    // Greek / symbolic LaTeX variable (e.g. \theta, \Omega)
    if (KNOWN_SYMBOLS.has(cmd)) {
      return createNode('variable', {
        value: cmd,
        raw: `\\${cmd}`,
        representation: 'linear',
        sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
        metadata: { symbol: true },
      });
    }

    // Fallback unknown LaTeX command
    return createNode('unknown', {
      value: `\\${cmd}`,
      raw: `\\${cmd}`,
      sourceSpan: makeSpan(this.offsetBase + start, this.offsetBase + this.pos),
    });
  }
}

export function parseExpression(expr: string, context: ParseContext = {}): ParseResult {
  const trimmed = expr.trim();
  if (!trimmed) {
    return {
      rawAst: createNode('unknown', { value: '', raw: '' }),
      parseStatus: 'failed',
      diagnostics: [
        {
          level: 'error',
          code: 'EMPTY_INPUT',
          message: 'Expression cannot be empty.',
        },
      ],
    };
  }

  const diagnostics: DiagnosticMessage[] = [];
  const parser = new ExpressionParser(trimmed, 0, diagnostics, context);
  const rawAst = parser.parse();

  const hasErrors = diagnostics.some((d) => d.level === 'error');
  const hasWarnings = diagnostics.some((d) => d.level === 'warning');
  const parseStatus = hasErrors ? 'failed' : hasWarnings ? 'partial' : 'parsed';

  return {
    rawAst,
    parseStatus,
    diagnostics,
  };
}
