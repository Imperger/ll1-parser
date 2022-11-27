# LL(1) parser

![test](https://github.com/Imperger/ll1-parser/actions/workflows/test.yml/badge.svg)
[![codecov](https://codecov.io/gh/Imperger/ll1-parser/branch/main/graph/badge.svg?token=7RZYOF5A7E)](https://codecov.io/gh/Imperger/ll1-parser)

```ts
import { LL1Parser } from 'll1-parser';

const parser = new LL1Parser();

parser.AddRule('E', '(E+I)');
parser.AddRule('E', 'I');
parser.AddRule('I', '0');
parser.AddRule('I', '1');

parser.Compile();

console.log(parser.DumpTransitionTable());
/**
 *  ┌─────────┬──────┬──────┬─────────┐
 *  │ (index) │  0   │  1   │    (    │
 *  ├─────────┼──────┼──────┼─────────┤
 *  │    E    │ 'I'  │ 'I'  │ '(E+I)' │
 *  │    I    │ '0'  │ '1'  │         │
 *  │    S    │ 'E$' │ 'E$' │  'E$'   │
 *  └─────────┴──────┴──────┴─────────┘
 **/ 

const tree1 = parser.Parse('((0+1)+1)');
/**
 * E
 * ├── (
 * ├─┬ E
 * │ ├── (
 * │ ├─┬ E
 * │ │ └─┬ I
 * │ │   └── 0
 * │ ├── +
 * │ ├─┬ I
 * │ │ └── 1
 * │ └── )
 * ├── +
 * ├─┬ I
 * │ └── 1
 * └── )
 **/

const tree2 = parser.Parse('(0+2)');
// Error: Failed to find grammar for transition 'I => 2'
```
