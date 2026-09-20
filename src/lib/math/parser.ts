/* =========================================================
   Math Engine VisualMath AI
   - Lexer + parser recursive descent (tanpa eval/Function)
   - Evaluator numerik dengan domain-check (NaN/inf = gap grafik)
   - Turunan simbolik (aturan rantai/hasil kali/hasil bagi)
   - Generator "langkah AI" berbasis aturan (rule-based)
   - Sampling grafik, akar, ekstrem, integrasi Simpson
   ========================================================= */

export type MathNode =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "const"; name: "pi" | "e" }
  | { kind: "neg"; arg: MathNode }
  | { kind: "fn"; name: string; arg: MathNode }
  | {
      kind: "bin";
      op: "+" | "-" | "*" | "/" | "^";
      left: MathNode;
      right: MathNode;
    };

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" };

const FUNCTION_NAMES = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "ln",
  "log",
  "sqrt",
  "abs",
  "exp",
  "floor",
  "ceil",
]);

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

/* ----------------------------- Errors ----------------------------- */

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/* ----------------------------- Preprocess ----------------------------- */

function preprocess(raw: string): string {
  let src = raw.toLowerCase().replace(/\s+/g, "");
  src = src.replace(/,/g, ".");
  src = src.replace(/π/g, "pi").replace(/∞/g, "infinity");
  // pecahan implisit dari unicode superscript sederhana
  src = src.replace(/²/g, "^2").replace(/³/g, "^3").replace(/¹/g, "^1");
  return src;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\d/.test(ch) || ch === ".") {
      let num = "";
      while (i < src.length && /[\d.]/.test(src[i])) num += src[i++];
      if ((num.match(/\./g) ?? []).length > 1)
        throw new ParseError(`Format angka tidak valid: ${num}`);
      const value = Number(num);
      if (!Number.isFinite(value)) throw new ParseError(`Angka tidak valid: ${num}`);
      tokens.push({ type: "num", value });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let word = "";
      while (i < src.length && /[a-zA-Z]/.test(src[i])) word += src[i++];
      tokens.push({ type: "ident", value: word });
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    throw new ParseError(`Karakter tidak dikenal: "${ch}"`);
  }
  return tokens;
}

function isImplicitMult(a: Token, b: Token): boolean {
  const aEnd = a.type === "num" || a.type === "rparen";
  const aVar = a.type === "ident" && !FUNCTION_NAMES.has(a.value) && !(a.value in CONSTANTS);
  const bStart = b.type === "lparen";
  const bNum = b.type === "num";
  const bIdentFn = b.type === "ident" && FUNCTION_NAMES.has(b.value);

  if (aEnd && (bStart || bNum || bIdentFn)) return true;
  if (a.type === "rparen" && b.type === "ident" && !FUNCTION_NAMES.has(b.value)) return true;
  if (aVar && bIdentFn) return true;
  return false;
}

function insertImplicitMult(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && isImplicitMult(prev, t)) {
      out.push({ type: "op", value: "*" });
    }
    out.push(t);
  }
  return out;
}

/* ----------------------------- Parser ----------------------------- */

export interface ParseResult {
  root: MathNode;
  variable: string;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private variables = new Set<string>();
  readonly variable: string;

  constructor(tokens: Token[], expectedVariable: string) {
    this.tokens = tokens;
    this.variable = expectedVariable;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private expectRparen(): void {
    const t = this.next();
    if (t?.type !== "rparen") throw new ParseError("Tanda kurung tidak seimbang");
  }

  private expectEnd(): void {
    if (this.pos < this.tokens.length)
      throw new ParseError(
        `Ada sisa ekspresi setelah "${this.tokens[this.pos].type}". Periksa operator, misalnya gunakan * eksplisit.`,
      );
  }

  parse(): MathNode {
    const node = this.parseExpr();
    this.expectEnd();
    if (this.variables.size > 1) {
      const [first, second] = [...this.variables];
      throw new ParseError(
        `Ditemukan lebih dari satu variabel (${first}, ${second}). Engine ini mendukung 1 variabel saja.`,
      );
    }
    return node;
  }

  private parseExpr(): MathNode {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.parseTerm();
        left = { kind: "bin", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseTerm(): MathNode {
    let left = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        this.next();
        const right = this.parseFactor();
        left = { kind: "bin", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseFactor(): MathNode {
    const base = this.parseUnary();
    const t = this.peek();
    if (t && t.type === "op" && t.value === "^") {
      this.next();
      const exp = this.parseFactor(); // kanan-asisosiatif
      return { kind: "bin", op: "^", left: base, right: exp };
    }
    return base;
  }

  private parseUnary(): MathNode {
    const t = this.peek();
    if (t && t.type === "op" && t.value === "-") {
      this.next();
      const arg = this.parseUnary();
      return { kind: "neg", arg };
    }
    if (t && t.type === "op" && t.value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parseAtom();
  }

  private parseAtom(): MathNode {
    const t = this.next();
    if (!t) throw new ParseError("Ekspresi berakhir di tengah");
    if (t.type === "num") return { kind: "num", value: t.value };
    if (t.type === "lparen") {
      const inner = this.parseExpr();
      this.expectRparen();
      return inner;
    }
    if (t.type === "op") throw new ParseError(`Operator "${t.value}" di posisi tidak valid`);
    if (t.type === "rparen") throw new ParseError("Tanda kurung tidak seimbang");

    // ident
    if (FUNCTION_NAMES.has(t.value)) {
      const arg = this.parseUnary();
      return { kind: "fn", name: t.value, arg };
    }
    if (t.value in CONSTANTS) {
      return { kind: "const", name: t.value as "pi" | "e" };
    }
    this.variables.add(t.value);
    return { kind: "var", name: t.value };
  }
}

/* ----------------------------- Evaluator ----------------------------- */

function applyFn(name: string, x: number): number {
  switch (name) {
    case "sin":
      return Math.sin(x);
    case "cos":
      return Math.cos(x);
    case "tan":
      return Math.tan(x);
    case "asin":
      return Math.asin(x);
    case "acos":
      return Math.acos(x);
    case "atan":
      return Math.atan(x);
    case "sinh":
      return Math.sinh(x);
    case "cosh":
      return Math.cosh(x);
    case "tanh":
      return Math.tanh(x);
    case "ln":
      return Math.log(x);
    case "log":
      return Math.log10(x);
    case "sqrt":
      return Math.sqrt(x);
    case "abs":
      return Math.abs(x);
    case "exp":
      return Math.exp(x);
    case "floor":
      return Math.floor(x);
    case "ceil":
      return Math.ceil(x);
    default:
      return NaN;
  }
}

export function evaluate(node: MathNode, variableValue: number, varName: string): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "const":
      return CONSTANTS[node.name] ?? NaN;
    case "var":
      return node.name === varName ? variableValue : NaN;
    case "neg":
      return -evaluate(node.arg, variableValue, varName);
    case "fn":
      return applyFn(node.name, evaluate(node.arg, variableValue, varName));
    case "bin": {
      const l = evaluate(node.left, variableValue, varName);
      const r = evaluate(node.right, variableValue, varName);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "^":
          return l ** r;
      }
    }
  }
}

/** Buat closure fungsi numerik aman. NaN/infinity untuk di luar domain. */
export function makeFunction(node: MathNode, varName: string): (x: number) => number {
  return (x: number) => {
    const v = evaluate(node, x, varName);
    return Number.isFinite(v) ? v : NaN;
  };
}

/** Jumlahkan fungsi via Simpson komposit pada [a,b]; loncat bila evaluasi gagal. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 1000): number {
  const h = (b - a) / n;
  let sum = 0;
  const evalSafe = (x: number): number => {
    const v = f(x);
    return Number.isFinite(v) && Math.abs(v) < 1e7 ? v : NaN;
  };
  const f0 = evalSafe(a);
  const fn = evalSafe(b);
  if (Number.isNaN(f0) || Number.isNaN(fn)) return NaN;
  sum += f0 + fn;
  for (let i = 1; i < n; i++) {
    const v = evalSafe(a + i * h);
    if (Number.isNaN(v)) return NaN;
    sum += (i % 2 === 0 ? 2 : 4) * v;
  }
  return (sum * h) / 3;
}

export function numericDerivative(f: (x: number) => number, x: number, h = 1e-5): number {
  const hp = x + h;
  const hm = x - h;
  const fp = f(hp);
  const fm = f(hm);
  if (Number.isNaN(fp) || Number.isNaN(fm)) return NaN;
  const d = (fp - fm) / (2 * h);
  return Number.isFinite(d) ? d : NaN;
}

/* ----------------------------- Simbolik: turunan ----------------------------- */

function isConstantNode(n: MathNode): boolean {
  return n.kind === "num" || n.kind === "const";
}

/**
 * Turunan simbolik. Mengembalikan null bila bentuk tidak didukung
 * (fallback ke turunan numerik di lapisan analisis).
 */
export function diff(node: MathNode, varName: string): MathNode | null {
  switch (node.kind) {
    case "num":
    case "const":
      return { kind: "num", value: 0 };
    case "var":
      return node.name === varName ? { kind: "num", value: 1 } : { kind: "num", value: 0 };
    case "neg": {
      const d = diff(node.arg, varName);
      return d ? { kind: "neg", arg: d } : null;
    }
    case "bin": {
      if (node.op === "+") {
        const l = diff(node.left, varName);
        const r = diff(node.right, varName);
        if (!l || !r) return null;
        return { kind: "bin", op: "+", left: l, right: r };
      }
      if (node.op === "-") {
        const l = diff(node.left, varName);
        const r = diff(node.right, varName);
        if (!l || !r) return null;
        return { kind: "bin", op: "-", left: l, right: r };
      }
      if (node.op === "*") {
        const l = diff(node.left, varName);
        const r = diff(node.right, varName);
        if (!l || !r) return null;
        const p1 = { kind: "bin", op: "*", left: l, right: node.right } as const;
        const p2 = { kind: "bin", op: "*", left: node.left, right: r } as const;
        return { kind: "bin", op: "+", left: p1, right: p2 };
      }
      if (node.op === "/") {
        const l = diff(node.left, varName);
        const r = diff(node.right, varName);
        if (!l || !r) return null;
        const a = { kind: "bin", op: "*", left: l, right: node.right } as const;
        const b = { kind: "bin", op: "*", left: node.left, right: r } as const;
        const num = { kind: "bin", op: "-", left: a, right: b } as const;
        const den = {
          kind: "bin",
          op: "^",
          left: node.right,
          right: { kind: "num", value: 2 },
        } as const;
        return { kind: "bin", op: "/", left: num, right: den };
      }
      if (node.op === "^") {
        const dBase = diff(node.left, varName);
        if (!dBase) return null;
        if (isConstantNode(node.right)) {
          const n = node.right;
          const minus = {
            kind: "bin",
            op: "-",
            left: n,
            right: { kind: "num", value: 1 },
          } as const;
          const pow = { kind: "bin", op: "^", left: node.left, right: minus } as const;
          const mult = { kind: "bin", op: "*", left: n, right: pow } as const;
          return { kind: "bin", op: "*", left: mult, right: dBase };
        }
        if (isConstantNode(node.left) && node.right.kind === "var") {
          const lnBase = { kind: "fn", name: "ln", arg: node.left } as const;
          return { kind: "bin", op: "*", left: node, right: lnBase };
        }
        return null;
      }
      return null;
    }
    case "fn": {
      const dArg = diff(node.arg, varName);
      if (!dArg) return null;
      const chain = node.arg;
      switch (node.name) {
        case "sin":
          return {
            kind: "bin",
            op: "*",
            left: { kind: "fn", name: "cos", arg: chain },
            right: dArg,
          };
        case "cos":
          return {
            kind: "neg",
            arg: {
              kind: "bin",
              op: "*",
              left: { kind: "fn", name: "sin", arg: chain },
              right: dArg,
            },
          };
        case "tan": {
          const cos = { kind: "fn", name: "cos", arg: chain } as const;
          const denom = {
            kind: "bin",
            op: "^",
            left: cos,
            right: { kind: "num", value: 2 },
          } as const;
          const num = { kind: "num", value: 1 } as const;
          return {
            kind: "bin",
            op: "*",
            left: { kind: "bin", op: "/", left: num, right: denom },
            right: dArg,
          };
        }
        case "exp":
          return {
            kind: "bin",
            op: "*",
            left: { kind: "fn", name: "exp", arg: chain },
            right: dArg,
          };
        case "ln":
          return { kind: "bin", op: "/", left: dArg, right: chain };
        case "sqrt": {
          const two = { kind: "num", value: 2 } as const;
          const twoSqrt = {
            kind: "bin",
            op: "*",
            left: two,
            right: { kind: "fn", name: "sqrt", arg: chain },
          } as const;
          return { kind: "bin", op: "/", left: dArg, right: twoSqrt };
        }
        case "asin": {
          const one = { kind: "num", value: 1 } as const;
          const sq = {
            kind: "bin",
            op: "^",
            left: chain,
            right: { kind: "num", value: 2 },
          } as const;
          const sub = { kind: "bin", op: "-", left: one, right: sq } as const;
          const sqr = { kind: "fn", name: "sqrt", arg: sub } as const;
          return { kind: "bin", op: "/", left: dArg, right: sqr };
        }
        case "atan": {
          const one = { kind: "num", value: 1 } as const;
          const sq = {
            kind: "bin",
            op: "^",
            left: chain,
            right: { kind: "num", value: 2 },
          } as const;
          const add = { kind: "bin", op: "+", left: one, right: sq } as const;
          return { kind: "bin", op: "/", left: dArg, right: add };
        }
        default:
          return null;
      }
    }
  }
}

/* ----------------------------- Pretty print ----------------------------- */

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  ".": "·",
};

function toSuperscript(value: number): string {
  return String(value)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const r = Math.round(n * 1e8) / 1e8;
  return Object.is(r, -0) ? "0" : String(r);
}

function precedence(n: MathNode): number {
  switch (n.kind) {
    case "num":
    case "var":
    case "const":
      return 9;
    case "neg":
    case "fn":
      return 8;
    case "bin":
      return n.op === "^" ? 7 : n.op === "*" || n.op === "/" ? 6 : 5;
  }
}

export function pretty(n: MathNode): string {
  switch (n.kind) {
    case "num":
      return fmtNum(n.value);
    case "var":
      return n.name;
    case "const":
      return n.name === "pi" ? "π" : "e";
    case "neg":
      return `-${prettyChild(n.arg, 8)}`;
    case "fn":
      return `${n.name}(${pretty(n.arg)})`;
    case "bin": {
      if (n.op === "^" && n.right.kind === "num") {
        const baseStr = precedence(n.left) < 7 ? `(${pretty(n.left)})` : pretty(n.left);
        return `${baseStr}${toSuperscript(Math.round(n.right.value * 1e8) / 1e8)}`;
      }
      const opStr = ` ${n.op === "*" ? "·" : n.op} `;
      const leftP = precedence(n.left) < precedence(n) ? 1 : 0;
      const rightP = precedence(n.right) <= precedence(n) ? 1 : 0;
      const l = leftP ? `(${pretty(n.left)})` : pretty(n.left);
      const r = rightP && n.op !== "*" ? `(${pretty(n.right)})` : pretty(n.right);
      return n.op === "*" ? `${l}${r}` : `${l}${opStr}${r}`;
    }
  }
}

function prettyChild(n: MathNode, parentPrec: number): string {
  return precedence(n) < parentPrec ? `(${pretty(n)})` : pretty(n);
}

/* ----------------------------- Step generator (rule-based AI) ----------------------------- */

export interface DerivativeStep {
  title: string;
  math: string;
  description: string;
}

export interface StepOutput {
  steps: DerivativeStep[];
  rulesUsed: string[];
}

const RULE_LABEL: Record<string, string> = {
  linearity: "Aturan linearitas (suku demi suku)",
  power: "Aturan pangkat: d/dx xⁿ = n·xⁿ⁻¹",
  constant: "Turunan konstanta = 0",
  identity: "Turunan x = 1",
  product: "Aturan hasil kali: (uv)′ = u′v + uv′",
  quotient: "Aturan hasil bagi: (u/v)′ = (u′v − uv′)/v²",
  chain: "Aturan rantai: (f∘g)′ = f′(g)·g′",
  neg: "Sifat linearitas (potong tanda negatif)",
};

function ruleOf(node: MathNode, varName: string): string[] {
  switch (node.kind) {
    case "num":
    case "const":
      return ["constant"];
    case "var":
      return [node.name === varName ? "identity" : "constant"];
    case "neg":
      return ["neg", ...ruleOf(node.arg, varName)];
    case "fn":
      return ["chain", ...ruleOf(node.arg, varName)];
    case "bin":
      if (node.op === "+" || node.op === "-")
        return ["linearity", ...ruleOf(node.left, varName), ...ruleOf(node.right, varName)];
      if (node.op === "*")
        return ["product", ...ruleOf(node.left, varName), ...ruleOf(node.right, varName)];
      if (node.op === "/")
        return ["quotient", ...ruleOf(node.left, varName), ...ruleOf(node.right, varName)];
      if (node.op === "^" && node.right.kind === "num")
        return ["power", ...ruleOf(node.left, varName)];
      if (node.op === "^") return ["chain"];
      return [];
  }
}

/** Bangun langkah-langkah turunan secara rekursif sambil menghitung turunan. */
function diffWithSteps(node: MathNode, varName: string, steps: DerivativeStep[]): MathNode | null {
  switch (node.kind) {
    case "num":
    case "const": {
      steps.push({
        title: "Turunkan konstanta",
        math: `d/dx ${pretty(node)} = 0`,
        description: "Turunan dari bilangan konstanta selalu nol karena nilainya tidak berubah.",
      });
      return { kind: "num", value: 0 };
    }
    case "var": {
      steps.push({
        title: node.name === varName ? "Turunkan variabel" : "Perlakukan konstanta",
        math: `d/d${varName} ${node.name} = ${node.name === varName ? "1" : "0"}`,
        description:
          node.name === varName
            ? "Laju perubahan variabel terhadap dirinya sendiri adalah 1."
            : "Variabel lain diperlakukan sebagai konstanta pada turunan parsial.",
      });
      return { kind: "num", value: 1 };
    }
    case "neg": {
      const d = diffWithSteps(node.arg, varName, steps);
      if (!d) return null;
      steps.push({
        title: "Faktorkan tanda negatif",
        math: `d/d${varName} (-${pretty(node.arg)}) = -d/d${varName} (${pretty(node.arg)})`,
        description: "Turunan bersifat linear, tanda negatif bisa dikeluarkan.",
      });
      return { kind: "neg", arg: d };
    }
    case "fn": {
      const dArg = diffWithSteps(node.arg, varName, steps);
      if (!dArg) return null;
      const der = diff(node, varName);
      if (!der) return null;
      steps.push({
        title: `Terapkan aturan rantai untuk ${node.name}(${pretty(node.arg)})`,
        math: `d/d${varName} ${pretty(node)} = ${pretty(der)}`,
        description: `Fungsi luar ${node.name} diterapkan ke dalam g = ${pretty(node.arg)}; kalikan turunan fungsi luar dengan turunan dalam.`,
      });
      return der;
    }
    case "bin": {
      if (node.op === "+" || node.op === "-") {
        steps.push({
          title: "Pisahkan per suku (linearitas)",
          math: `d/d${varName} ( ${pretty(node)} )`,
          description:
            "Turunan dari penjumlahan/pengurangan sama dengan penjumlahan/pengurangan turunan tiap suku.",
        });
        const l = diffWithSteps(node.left, varName, steps);
        const r = diffWithSteps(node.right, varName, steps);
        if (!l || !r) return null;
        return { kind: "bin", op: node.op, left: l, right: r };
      }
      if (node.op === "*") {
        steps.push({
          title: "Terapkan aturan hasil kali",
          math: `(u·v)′ = u′v + uv′`,
          description: `dengan u = ${pretty(node.left)} dan v = ${pretty(node.right)}.`,
        });
        const l = diffWithSteps(node.left, varName, steps);
        const r = diffWithSteps(node.right, varName, steps);
        if (!l || !r) return null;
        return diff(node, varName);
      }
      if (node.op === "/") {
        steps.push({
          title: "Terapkan aturan hasil bagi",
          math: `(u/v)′ = (u′v − uv′)/v²`,
          description: `dengan u = ${pretty(node.left)} dan v = ${pretty(node.right)} (v ≠ 0).`,
        });
        const l = diffWithSteps(node.left, varName, steps);
        const r = diffWithSteps(node.right, varName, steps);
        if (!l || !r) return null;
        return diff(node, varName);
      }
      if (node.op === "^") {
        if (node.right.kind === "num") {
          const n = node.right.value;
          steps.push({
            title: `Terapkan aturan pangkat (n = ${fmtNum(n)})`,
            math: `d/d${varName} (${pretty(node.left)})^${fmtNum(n)} = ${n}·(${pretty(node.left)})^${fmtNum(n - 1)}·g′`,
            description: "Bawa pangkat ke depan, kurangi pangkat satu, lalu kalikan turunan basis.",
          });
          const dBase = diffWithSteps(node.left, varName, steps);
          if (!dBase) return null;
          return diff(node, varName);
        }
        steps.push({
          title: "Bentuk pangkat dinamis — gunakan logaritma natural",
          math: `d/d${varName} ${pretty(node)}`,
          description:
            "Fungsi pangkat dengan eksponen variabel diturunkan dengan manipulasi e^(ln f).",
        });
        return diff(node, varName);
      }
      return null;
    }
  }
}

export function generateSteps(node: MathNode, varName: string): StepOutput {
  const steps: DerivativeStep[] = [];
  steps.push({
    title: "Identifikasi fungsi f(x)",
    math: `f(${varName}) = ${pretty(node)}`,
    description: `Mari kita tentukan turunan f terhadap variabel ${varName} langkah demi langkah.`,
  });
  const rulesUsed = [...new Set(ruleOf(node, varName))];
  const derivative = diffWithSteps(node, varName, steps);
  if (derivative) {
    steps.push({
      title: "Hasil akhir",
      math: `f′(${varName}) = ${pretty(derivative)}`,
      description: `Dengan ${rulesUsed.length > 0 ? `aturan: ${rulesUsed.map((r) => RULE_LABEL[r] ?? r).join("; ")}` : "identitas turunan dasar"}.`,
    });
  } else {
    steps.push({
      title: "Catatan",
      math: "Turunan bentuk ini dihitung secara numerik",
      description:
        "Ekspresi tidak cocok dengan bentuk simbolik yang didukung, sehingga turunan dihitung hampiran numerik (bed hingga).",
    });
  }
  return { steps, rulesUsed };
}

/* ----------------------------- Analisis lengkap ----------------------------- */

export interface MathPoint {
  x: number;
  y: number;
}

export interface MathSegment {
  points: MathPoint[];
}

export interface AnalysisNumbers {
  points: MathPoint[];
  segments: MathSegment[];
  derivativeSegments: MathSegment[];
  derivativePoints: MathPoint[];
  roots: MathPoint[];
  extrema: Array<{ kind: "min" | "maks"; x: number; y: number }>;
}

export interface AnalysisText {
  normalized: string;
  pretty: string;
  derivativePretty: string;
  integral: number | null;
  integralText: string;
  steps: DerivativeStep[];
  rulesUsed: string[];
  explanation: string;
  variable: string;
}

export interface AnalysisResult {
  node: MathNode;
  numbers: AnalysisNumbers;
  text: AnalysisText;
}

export function analyzeExpression(raw: string, expectedVariable = "x"): AnalysisResult {
  const src = preprocess(raw);
  const tokens = insertImplicitMult(tokenize(src));
  const parser = new Parser(tokens, expectedVariable);
  const root = parser.parse();
  const variable = parser.variable === "" ? expectedVariable : parser.variable;

  const f = makeFunction(root, variable);

  /* Sampling dengan gap untuk asimtot */
  const DOMAIN = [-8, 8];
  const STEP = 0.06;
  const Y_CAP = 60;

  const rawPoints: MathPoint[] = [];
  for (let x = DOMAIN[0]; x <= DOMAIN[1] + 1e-9; x += STEP) {
    const y = f(x);
    if (!Number.isNaN(y) && Math.abs(y) <= Y_CAP) rawPoints.push({ x, y });
  }

  const segments: MathSegment[] = [];
  let current: MathPoint[] = [];
  for (const p of rawPoints) {
    if (current.length === 0 || Math.abs(p.x - current[current.length - 1].x) <= STEP * 1.6) {
      current.push(p);
    } else {
      if (current.length >= 2) segments.push({ points: current });
      current = [p];
    }
  }
  if (current.length >= 2) segments.push({ points: current });

  /* Turunan numerik */
  const df = (x: number) => numericDerivative(f, x);
  const rawDeriv: MathPoint[] = [];
  for (let x = DOMAIN[0]; x <= DOMAIN[1] + 1e-9; x += STEP) {
    const y = df(x);
    if (!Number.isNaN(y) && Math.abs(y) <= Y_CAP) rawDeriv.push({ x, y });
  }
  const derivSegments: MathSegment[] = [];
  current = [];
  for (const p of rawDeriv) {
    if (current.length === 0 || Math.abs(p.x - current[current.length - 1].x) <= STEP * 1.6) {
      current.push(p);
    } else {
      if (current.length >= 2) derivSegments.push({ points: current });
      current = [p];
    }
  }
  if (current.length >= 2) derivSegments.push({ points: current });

  /* Akar: deteksi perubahan tanda */
  const roots: MathPoint[] = [];
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const a = rawPoints[i];
    const b = rawPoints[i + 1];
    if (b.x - a.x > STEP * 1.6) continue;
    const fa = f(a.x);
    const fb = f(b.x);
    if (Number.isNaN(fa) || Number.isNaN(fb)) continue;
    if (Math.abs(fa) < 0.05) {
      if (!roots.some((r) => Math.abs(r.x - a.x) < STEP)) roots.push({ x: a.x, y: fa });
      continue;
    }
    if (fa * fb < 0) {
      let lo = a.x;
      let hi = b.x;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (Number.isNaN(fm)) break;
        if (fa * fm <= 0) hi = mid;
        else lo = mid;
        if (hi - lo < 1e-6) break;
      }
      const xRoot = (lo + hi) / 2;
      roots.push({ x: xRoot, y: f(xRoot) });
    }
  }

  /* Ekstrem: perubahan tanda turunan (dengan h dibuat kecil) */
  const extrema: Array<{ kind: "min" | "maks"; x: number; y: number }> = [];
  for (let i = 0; i < rawDeriv.length - 1; i++) {
    const a = rawDeriv[i];
    const b = rawDeriv[i + 1];
    if (b.x - a.x > STEP * 1.6) continue;
    const da = df(a.x);
    const db = df(b.x);
    if (Number.isNaN(da) || Number.isNaN(db)) continue;
    if (da * db < 0) {
      // cari perpotongan turunan dengan bidirection
      let lo = a.x;
      let hi = b.x;
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        const dm = df(mid);
        if (Number.isNaN(dm)) break;
        if (da * dm <= 0) hi = mid;
        else lo = mid;
        if (hi - lo < 1e-5) break;
      }
      const xE = (lo + hi) / 2;
      const yE = f(xE);
      const kind = da > 0 ? "min" : "maks";
      if (!extrema.some((e) => Math.abs(e.x - xE) < STEP)) {
        extrema.push({ kind, x: xE, y: yE });
      }
    }
  }

  /* Integral Simpson pada [-6,6] */
  const INT_A = -6;
  const INT_B = 6;
  let integral: number | null = null;
  let integralText = "Terlalu kompleks untuk integrasi numerik.";
  try {
    const val = simpson(f, INT_A, INT_B);
    if (Number.isFinite(val)) {
      integral = Math.round(val * 1e4) / 1e4;
      integralText = `∫ −6 ke 6  f(x) dx ≈ ${integral.toLocaleString("id-ID")} (integrasi numerik Simpson)`;
    }
  } catch {
    integral = null;
  }

  const textNode = diff(root, variable);
  const steps = generateSteps(root, variable);

  const rules = steps.rulesUsed;
  const explanationParts: string[] = [];
  if (rules.includes("linearity"))
    explanationParts.push("f bersifat linear terhadap penjumlahan suku-sukunya");
  if (rules.includes("chain"))
    explanationParts.push("f merupakan fungsi bersusun, jadi aturan rantai menjadi kunci");
  if (rules.includes("power"))
    explanationParts.push("bentuk pangkat xⁿ dikerjakan dengan membawa pangkat ke depan");
  if (rules.includes("product"))
    explanationParts.push("terdapat hasil kali dua fungsi sehingga dipakai u′v + uv′");
  explanationParts.push(
    rules.length > 0
      ? `Aturan yang dipakai: ${rules.map((r) => RULE_LABEL[r] ?? r).join("; ")}`
      : "",
  );
  if (extrema.length > 0)
    explanationParts.push(
      `Grafik memiliki ${extrema.length} titik ${extrema[0].kind === "min" ? "minimum/minimum lokal" : "ekstrem"}: f′ berubah tanda di x ≈ ${extrema[0].x.toFixed(2)}.`,
    );

  const explanation = `${explanationParts.filter(Boolean).join(". ")}.`;

  return {
    node: root,
    numbers: {
      points: rawPoints,
      segments,
      derivativeSegments: derivSegments,
      derivativePoints: rawDeriv,
      roots,
      extrema,
    },
    text: {
      normalized: raw,
      pretty: pretty(root),
      derivativePretty: textNode
        ? pretty(textNode)
        : "≈ turunan numerik (bentuk simbolik didukung sebagian)",
      integral,
      integralText,
      steps: steps.steps,
      rulesUsed: steps.rulesUsed,
      explanation,
      variable,
    },
  };
}
