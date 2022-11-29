class SparseTable<TRow, TCol, TVal> {
  private static notValue = Symbol('Not a value');

  private table = new Map<TRow, Map<TCol, TVal>>();

  Set(row: TRow, col: TCol, val: TVal): void {
    let rowSet = this.table.get(row);

    if (!rowSet) {
      rowSet = new Map<TCol, TVal>();
      this.table.set(row, rowSet);
    }

    rowSet.set(col, val);
  }

  Get(row: TRow, col: TCol): TVal | symbol {
    return this.table.get(row)?.get(col) ?? SparseTable.notValue;
  }

  public IsValue(val: TVal | symbol): val is TVal {
    return val !== SparseTable.notValue;
  }
}

export class ParsedNode {
  private parent: ParsedNode | null = null;

  private childs: ParsedNode[] = [];

  constructor(public readonly Label: string, parent: ParsedNode | null = null) {
    parent?.AddChild(this);
  }

  AddChild(node: ParsedNode): void {
    if (!this.childs.includes(node)) {
      this.childs.push(node);
      node.parent = this;
    }
  }

  get Childs(): readonly ParsedNode[] {
    return this.childs;
  }

  get Parent(): ParsedNode | null {
    return this.parent;
  }
}

export class LL1Parser {
  private Epsilon = 'ε';
  private sentinel = '$';
  private grammar = new Map<string, string[][]>();
  private start = '';
  private jumpTable = new SparseTable<string, string, string[]>();
  private terms = new Set<string>();
  private nullableSet = new Set<string>();
  private firstSet = new Map<string, Set<string>>();
  private followSet = new Map<string, Set<string>>();

  AddRule(nonterminal: string, rule: string) {
    if (this.start.length === 0) {
      this.start = nonterminal;
    }

    const rules = this.grammar.get(nonterminal);

    const refined = rule.split('').filter((x) => x !== this.Epsilon);

    if (rules) {
      rules.push(refined);
    } else {
      this.grammar.set(nonterminal, [refined]);
    }
  }

  private PopulateTerms(): void {
    this.terms = new Set([...this.grammar.values(), '$'].flat(2).filter((x) => !this.IsNonterm(x)));
  }

  private IsNonterm(symb: string): boolean {
    return this.grammar.has(symb);
  }

  private IsTerm(x: string): boolean {
    return this.terms.has(x);
  }

  Compile() {
    this.PopulateTerms();

    this.AddSyntaticStart();
    this.BuildNullableSet();
    this.BuildFirstSet();
    this.BuildFollowSet();
    this.BuildJumpTable();
  }

  private AddSyntaticStart(): void {
    const syntatic = this.grammar.get('S');
    const rule = [this.start, this.sentinel];
    if (syntatic) {
      syntatic.push(rule);
    } else {
      this.grammar.set('S', [rule]);
    }
  }

  /**
   *  Builds the set of nonterminals that may be replaced by an empty string
   */
  private BuildNullableSet(): void {
    for (let hasChanges = true; hasChanges; ) {
      hasChanges = false;

      this.ForEachGrammar((nonterm, rule) => {
        if (!this.nullableSet.has(nonterm) && rule.every((x) => this.nullableSet.has(x))) {
          this.nullableSet.add(nonterm);
          hasChanges = true;
        }
      });
    }
  }

  private BuildFirstSet(): void {
    for (const term of this.Terms) {
      this.firstSet.set(term, new Set([term]));
    }

    for (const nonterm of this.Nonterms) {
      this.firstSet.set(nonterm, new Set<string>());
    }

    for (let hasChanges = true; hasChanges; ) {
      hasChanges = false;

      for (const [nonterm, rules] of this.grammar) {
        const nontermToTerms = this.firstSet.get(nonterm)!;
        for (const rule of rules) {
          for (const term of this.FirstTerminals(rule)) {
            if (!nontermToTerms.has(term)) {
              nontermToTerms.add(term);
              hasChanges = true;
            }
          }
        }
      }
    }
  }

  private BuildFollowSet(): void {
    for (const nonterm of this.Nonterms) {
      this.followSet.set(nonterm, new Set<string>());
    }

    for (let hasChanges = true; hasChanges; ) {
      hasChanges = false;

      this.ForEachGrammar((nonterm, rule) => {
        let nontermToTerms = this.followSet.get(nonterm)!;
        for (let n = rule.length - 1; n >= 0; --n) {
          if (this.Nonterms.includes(rule[n])) {
            for (const nontermFollowTerm of nontermToTerms) {
              const h = this.followSet.get(rule[n])!;
              if (!h.has(nontermFollowTerm)) {
                h.add(nontermFollowTerm);
                hasChanges = true;
              }
            }
          }

          if (this.nullableSet.has(rule[n])) {
            const k = new Set<string>(nontermToTerms);
            for (const term of this.firstSet.get(rule[n])!) {
              k.add(term);
            }
            nontermToTerms = k;
          } else {
            nontermToTerms = this.firstSet.get(rule[n])!;
          }
        }
      });
    }
  }

  BuildJumpTable(): void {
    this.ForEachGrammar((nonterm, rule) => {
      for (const term of this.FirstTerminals(rule)) {
        if (!this.jumpTable.IsValue(this.jumpTable.Get(nonterm, term))) {
          this.jumpTable.Set(nonterm, term, rule);
        } else {
          throw new Error(`Ambiguous rule '${rule}' for '${nonterm} => ${term}`);
        }
      }

      if (rule.every((x) => this.nullableSet.has(x))) {
        for (const term of this.followSet.get(nonterm) ?? []) {
          this.jumpTable.Set(nonterm, term, rule);
        }
      }
    });
  }

  private ForEachGrammar(fn: (nonterm: string, rule: string[]) => void): void {
    for (const [nonterm, rules] of this.grammar) {
      for (const rule of rules) {
        fn(nonterm, rule);
      }
    }
  }

  /**
   *
   * @param rule array of terminals and\or non-terminals
   * @returns the set of possible first terms
   */
  private FirstTerminals(rule: string[]) {
    let end = rule.findIndex((x) => !this.nullableSet.has(x));
    if (end == -1) {
      end = rule.length - 1;
    }

    return rule
      .slice(0, end + 1)
      .map((x) => this.firstSet.get(x)!)
      .reduce(LL1Parser.Union, new Set<string>());
  }

  private static Union(set1: Set<string>, set2: Set<string>) {
    const u = new Set(set1);
    for (const elt of set2) {
      u.add(elt);
    }
    return u;
  }

  DumpTransitionTable() {
    const table: { [id: string]: { [id: string]: string } } = {};

    for (const [nonterm, rules] of this.grammar) {
      for (const term of this.terms) {
        if (!table[nonterm]) {
          table[nonterm] = {};
        }

        const rule = this.jumpTable.Get(nonterm, term);
        if (this.jumpTable.IsValue(rule)) {
          table[nonterm][term] = rule.length === 0 ? this.Epsilon : rule.join('');
        }
      }
    }

    return table;
  }

  private get Nonterms(): string[] {
    return [...this.grammar.keys()];
  }

  private get Terms(): string[] {
    return [...this.terms.values()];
  }

  Parse(input: string) {
    input += this.sentinel;
    const stack = [this.sentinel, this.start];
    let inputCursor = 0;
    const root = new ParsedNode(this.start);
    let parents = [root];

    while (stack.length > 0 && stack[stack.length - 1] !== '$') {
      const fetched = stack.pop()!;

      if (this.IsTerm(fetched)) {
        if (fetched === input[inputCursor]) {
          ++inputCursor;
          parents.pop();
        } else {
          throw new Error(`Unexpected token '${input[inputCursor]}', expects '${fetched}'`);
        }
      } else {
        const matchedRule = this.jumpTable.Get(fetched, input[inputCursor]);

        if (this.jumpTable.IsValue(matchedRule)) {
          stack.push(...[...matchedRule].reverse());

          const p = parents.pop()!;
          const childs: ParsedNode[] = [];
          if (matchedRule.length === 0) {
            p.AddChild(new ParsedNode(this.Epsilon));
          } else {
            for (const symb of matchedRule) {
              childs.push(new ParsedNode(symb, p));
            }
          }

          parents = [...parents, ...[...childs].reverse()];
        } else {
          throw new Error(
            `Failed to find grammar for transition '${fetched} => ${input[inputCursor]}'`
          );
        }
      }
    }

    const syntaticEnd = this.sentinel.length;
    if (inputCursor !== input.length - syntaticEnd) {
      throw new Error('Unexpected end of input');
    }

    return root;
  }
}
