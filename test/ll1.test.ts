import { describe, expect, test } from '@jest/globals';

import { LL1Parser, ParsedNode } from '../src/ll1';

describe('One simple rule', () => {
  const p = new LL1Parser();
  p.AddRule('A', '1');
  p.Compile();

  test('Correct input: "1"', () => {
    const root = new ParsedNode('A');
    root.AddChild(new ParsedNode('1', root));

    expect(p.Parse('1')).toEqual(root);
  });

  test('Incorrect input: "2"', () => {
    expect(() => p.Parse('2')).toThrow(Error);
  });
});

describe('Basic combining', () => {
  const p = new LL1Parser();
  p.AddRule('C', 'AB');
  p.AddRule('A', '0');
  p.AddRule('B', '1');
  p.Compile();

  test('Correct input: "01"', () => {
    const root = new ParsedNode('C');
    const a = new ParsedNode('A', root);
    const b = new ParsedNode('B', root);
    const one = new ParsedNode('0', a);
    const two = new ParsedNode('1', b);

    expect(p.Parse('01')).toEqual(root);
  });

  test('Unexpected token for "A"', () => {
    expect(() => p.Parse('11')).toThrow(Error);
  });

  test('Unexpected token for "B"', () => {
    expect(() => p.Parse('00')).toThrow(Error);
  });

  test('Unexpected end of input', () => {
    expect(() => p.Parse('0')).toThrow(Error);
  });

  test('Unexpectedly long input', () => {
    expect(() => p.Parse('010')).toThrow(Error);
  });
});

describe('Empty rule', () => {
  const p = new LL1Parser();
  p.AddRule('A', 'ε');
  p.Compile();

  test('Correct input: ""', () => {
    const root = new ParsedNode('A');
    const epsilon = new ParsedNode('ε', root);

    expect(p.Parse('')).toEqual(root);
  });
});

describe('Basic chaining', () => {
  const p = new LL1Parser();
  p.AddRule('A', 'B');
  p.AddRule('B', 'C');
  p.AddRule('C', '0');
  p.Compile();

  test('Correct input: "0"', () => {
    const root = new ParsedNode('A');
    const b = new ParsedNode('B', root);
    const c = new ParsedNode('C', b);
    const zero = new ParsedNode('0', c);

    expect(p.Parse('0')).toEqual(root);
  });

  test('Unexpected token: "1"', () => {
    expect(() => p.Parse('1')).toThrow(Error);
  });
});

describe('Complex sample #1', () => {
  const p = new LL1Parser();
  p.AddRule('E', '(D+E)');
  p.AddRule('E', 'N');
  p.AddRule('D', '0');
  p.AddRule('D', '1');
  p.AddRule('D', '2');
  p.AddRule('N', 'n');
  p.AddRule('N', 'DN');

  p.Compile();

  test('Correct input: "(1+0n)"', () => {
    const root = new ParsedNode('E');
    const openParenthesis = new ParsedNode('(', root);
    const dNode = new ParsedNode('D', root);
    const one = new ParsedNode('1', dNode);
    const plus = new ParsedNode('+', root);
    const eNode = new ParsedNode('E', root);
    const en = new ParsedNode('N', eNode);
    const end = new ParsedNode('D', en);
    const end0 = new ParsedNode('0', end);
    const nn = new ParsedNode('N', en);
    const nnn = new ParsedNode('n', nn);
    const closeParenthesis = new ParsedNode(')', root);

    expect(p.Parse('(1+0n)')).toEqual(root);
  });
});

describe('Complex sample #2', () => {
  const p = new LL1Parser();
  p.AddRule('E', 'TY');
  p.AddRule('Y', '+TY');
  p.AddRule('Y', 'ε');
  p.AddRule('T', 'FH');
  p.AddRule('H', '*FH');
  p.AddRule('H', 'ε');
  p.AddRule('F', '(E)');
  p.AddRule('F', 'i');

  p.Compile();

  test('Correct input: "i+i"', () => {
    const root = new ParsedNode('E');
    const t = new ParsedNode('T', root);
    const tf = new ParsedNode('F', t);
    const tfi = new ParsedNode('i', tf);
    const th = new ParsedNode('H', t);
    const the = new ParsedNode('ε', th);
    const y = new ParsedNode('Y', root);
    const yplus = new ParsedNode('+', y);
    const yt = new ParsedNode('T', y);
    const ytf = new ParsedNode('F', yt);
    const ytfi = new ParsedNode('i', ytf);
    const yth = new ParsedNode('H', yt);
    const ythe = new ParsedNode('ε', yth);
    const yy = new ParsedNode('Y', y);
    const yye = new ParsedNode('ε', yy);

    expect(p.Parse('i+i')).toEqual(root);
  });
});
