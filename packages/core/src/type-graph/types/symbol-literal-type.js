// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { CALLABLE } from "../constants";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";
import { $BottomType } from "./bottom-type";
import { FunctionType } from "./function-type";

const DIGIT_COUNT = 6;

class TrappedTypeVar extends TypeVar {
  previous: Type;
  // We need it for generating of unique symbol name for each call of "Symbol"
  changeAll(...args) {
    const result = super.changeAll(...args);
    return result.isSubtypeOf === Type.String 
      ? Type.term(`'${result.name.slice(1, -1)}_${Symbol.getHash()}'`, { isSubtypeOf: Type.String })
      : result;
  }
}

export class Symbol extends GenericType {
  static get name() {
    return "Symbol";
  }

  static getHash() {
    return String(~~(Math.random() * (10 ** DIGIT_COUNT)));
  }
  
  static getName(type, isRandom = false) {
    return `@@${String(type.name).slice(1, -1)}`;
  }
  
  static defineCallFunctionForSymbolConstructor() {
    // It's hack for standard environment to generate unique symbol type after each call of Symbol()
    const SymbolConstructor = Type.GlobalTypeScope.body.get("SymbolConstructor");
    if (SymbolConstructor === undefined) {
      return;
    }
    // cal : <T: string = "">(?T) => Symbol<T>
    let call = SymbolConstructor.properties.get(CALLABLE); 
    if (call !== undefined) {
      return;
    }
    const self = Type.GlobalTypeScope.body.get("Symbol");
    const localTypeScope = new TypeScope(self.parent);
    /*T : string = ""*/
    const T = TrappedTypeVar.term(
      "T", 
      { parent: localTypeScope },
      Type.String,
      Type.term("''", { isSubtypeOf: Type.String })
    );
    // callFunction : (?T) => Symbol<T>
    const callFunction = FunctionType.term(
      "magic (T | undefined) => Symbol<T>",
      {},
      [UnionType.term(null, {}, [Type.Undefined, T])],
      new $BottomType({}, self, [T])
    );
    // call : <T: string = "">(?T) => Symbol<T>
    call = GenericType.term(
      'magic <T: string = "">(T | undefined) => Symbol<T>',
      {},
      [T],
      localTypeScope,
      callFunction
    );
    SymbolConstructor.properties.set(CALLABLE, call);
  }


  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("Symbol", meta, [TypeVar.term("name", { parent }, Type.String)], parent, null);
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo(type) {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  // Needed to emulate "Symbol" interface from @hegel/typings/standard/index.d.ts:117
  getPropertyType(property: mixed, _: boolean = false, isForInit: boolean = false) {
    switch (property) {
      case "toString": return FunctionType.term("() => string", {}, [], Type.String);
      case "valueOf": return FunctionType.term("() => symbol", {}, [], Type.Symbol);
    }
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    return Type.term(Symbol.getName(target), { isSubtypeOf: Type.Symbol });
  }
}

