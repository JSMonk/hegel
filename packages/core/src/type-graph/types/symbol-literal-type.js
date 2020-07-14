// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { CALLABLE } from "../constants";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";
import { $BottomType } from "./bottom-type";
import { VariableInfo } from "../variable-info";
import { FunctionType } from "./function-type";

const DIGIT_COUNT = 7;

type SymbolType = 'raw' | 'hashed' | 'cashed';

class SymbolLiteral extends Type {
  static get name() {
    return "SymbolLiteral";
  }
  
  rawName: string | void;

  constructor(
    name: string,
    meta?: TypeMeta = {},
    rawName: string | void,
  ) {
    super(name, { ...meta, isSubtypeOf: Type.Symbol });
    this.rawName = rawName;
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof $BottomType && type.subordinateMagicType instanceof $Symbol) {
      return [{ 
        variable: type.genericArguments[0],
        root: this.rawName === undefined ? Type.Undefined : Type.term(this.rawName, { isSubtypeOf: Type.String })
      }];
    }
    this._alreadyProcessedWith = null;
    return super.getDifference(type, withReverseUnion);
  }
}

export class $Symbol extends GenericType<Type> {
  static symbolNamespace: Map<string, string> = new Map();

  static get name() {
    return "$Symbol";
  }

  static getHash() {
    return String(~~(Math.random() * (10 ** DIGIT_COUNT)));
  }

  static getName(type: Type, nameType: SymbolType = 'raw') {
    const name = type.isPrincipalTypeFor(Type.Undefined) ? "@@" : `@@${String(type.name).slice(1, -1)}`;
    switch (nameType) {
      case 'raw': return name;
      case 'hashed': return `${name}:${this.getHash()}`;
      case 'cashed': return this.getOrInsertIntoSymbolNamespace(type);
    }
  }

  static getOrInsertIntoSymbolNamespace(type: Type) {
    const name = String(type.name);
    const existed = this.symbolNamespace.get(name); 
    if (existed) {
      return existed;
    }
    const result = `${name}:${this.getHash()}`;
    this.symbolNamespace.set(name, result); 
    return result;
  }

  static defineSymbolConstructorMethods() {
    this.defineCallFunctionForSymbolConstructor();    
    this.defineSymbolConstructorMethodFor();
  }
  
  static defineSymbolConstructorMethodFor() {
    // It's hack for standard environment to generate unique symbol type after each call of Symbol()
    const SymbolConstructor = Type.GlobalTypeScope.body.get("SymbolConstructor");
    if (SymbolConstructor === undefined) {
      return;
    }
    // for : <T: string>(T) => Symbol<T>
    let _for = SymbolConstructor.properties.get("for"); 
    if (_for !== undefined) {
      return;
    }
    const self = Type.GlobalTypeScope.body.get("Symbol");
    const localTypeScope = new TypeScope(self.parent);
    /*T : string*/
    const T = TypeVar.term(
      "T", 
      { parent: localTypeScope },
      Type.String,
    );
    // forFunction : (T) => Symbol<T>
    const forFunction = FunctionType.term(
      "magic (T) => Symbol<T>",
      {},
      [T],
      new $BottomType({}, new $Symbol($Symbol.name, {}, 'cashed'), [T])
    );
    // for : <T: string>(T) => Symbol<T>
    _for = GenericType.term(
      'magic <T>(T) => Symbol<T>',
      {},
      [T],
      localTypeScope,
      forFunction
    );
    SymbolConstructor.properties.set("for", new VariableInfo(_for));
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
    const T = TypeVar.term(
      "T", 
      { parent: localTypeScope },
      UnionType.term(null, {}, [Type.String, Type.Undefined]),
      Type.Undefined
    );
    // callFunction : (?T) => Symbol<T>
    const callFunction = FunctionType.term(
      "magic (T | undefined) => Symbol<T>",
      {},
      [T],
      new $BottomType({}, new $Symbol($Symbol.name, {}, 'hashed'), [T])
    );
    // call : <T: string = "">(?T) => Symbol<T>
    call = GenericType.term(
      'magic <T: string | undefined>(T) => Symbol<T>',
      {},
      [T],
      localTypeScope,
      callFunction
    );
    SymbolConstructor.properties.set(CALLABLE, new VariableInfo(call));
  }

  symbolType: SymbolType;

  constructor(_, meta = {}, symbolType: SymbolType = "raw") {
    const parent = new TypeScope(meta.parent);
    super("Symbol", meta, [TypeVar.term("name", { parent }, UnionType.term(null, {}, [Type.String, Type.Undefined]))], parent, null);
    this.symbolType = symbolType;
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
    if (target === Type.String) {
      return Type.Symbol;
    }
    return SymbolLiteral.term(
      $Symbol.getName(target, this.symbolType),
      {},
      target.isPrincipalTypeFor(Type.Undefined) ? undefined : target.name
    );

  }
}

