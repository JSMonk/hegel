// @flow
import HegelError from "../../utils/errors";
import { THIS_TYPE } from "../constants";
import type { TypeVar } from "./type-var";
import type { TypeScope } from "../type-scope";
import type { SourceLocation } from "@babel/parser";

export type TypeMeta = {
  loc?: SourceLocation,
  parent?: TypeScope | void,
  isSubtypeOf?: Type | null,
  shouldBeUsedAsGeneric?: boolean
};

export class Type {
  static get name() {
    return "Type";
  }

  static GlobalTypeScope: TypeScope;
  static Undefined = new Type("undefined");
  static Null = new Type(null);
  static String = new Type("string");
  static Symbol = new Type("symbol");
  static True = new Type(true);
  static False = new Type(false);
  // Boolean described into /src/type-graph/types/union-type.js file because of circular dependencies
  //  static Boolean = new UnionType("boolean", {}, [Type.True, Type.False]);
  static Number = new Type("number");
  static BigInt = new Type("bigint");
  static Unknown = new Type("unknown");
  static Never = new Type("never");
  static prettyMode: boolean = false;

  static find(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    const scope = meta.parent || Type.GlobalTypeScope;
    // $FlowIssue
    const existed = scope.findTypeWithName(name, ...args);
    if (existed === undefined) {
      throw new HegelError(`Type "${String(name)}" does not exist`, meta.loc);
    }
    return existed;
  }

  static new(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    let scope = meta.parent || Type.GlobalTypeScope;
    const suptypeParent = meta.isSubtypeOf && meta.isSubtypeOf.parent;
    if (
      suptypeParent &&
      // $FlowIssue
      meta.isSubtypeOf.name !== THIS_TYPE &&
      suptypeParent.priority > scope.priority
    ) {
      scope = suptypeParent;
    }
    const newType = new this(name, { ...meta, parent: scope }, ...args);
    scope.body.set(name, newType);
    return newType;
  }

  static term(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    const scope = meta.parent || Type.GlobalTypeScope;
    const existed = scope.findTypeWithName(name);
    if (this.shouldBeReplaced(existed, name, meta, ...args)) {
      return this.new(name, meta, ...args);
    }
    return existed;
  }

  static shouldBeReplaced(
    type?: Type,
    name: mixed,
    meta: TypeMeta,
    ...args: Array<any>
  ) {
    return (
      type === undefined || !(type instanceof this || this.name === "TypeVar")
    );
  }

  static getTypeRoot(type: Type, stepBeforeNonVariableRoot?: boolean = false) {
    let potentialRoot = type;
    while (
      "root" in potentialRoot &&
      // $FlowIssue
      potentialRoot.root != undefined &&
      // $FlowIssue
      (!stepBeforeNonVariableRoot || "root" in potentialRoot.root)
    ) {
      // $FlowIssue
      potentialRoot = potentialRoot.root;
    }
    return potentialRoot;
  }

  name: mixed;
  parent: TypeScope;
  shouldBeUsedAsGeneric: boolean;
  isSubtypeOf: Type | null;
  _alreadyProcessedWith: Type | null = null;
  _changeStack: Array<Type> | null = null;
  onlyLiteral: boolean = false;
  priority = 1;

  constructor(name: mixed, meta: TypeMeta = {}) {
    const {
      parent = Type.GlobalTypeScope,
      isSubtypeOf = null,
      shouldBeUsedAsGeneric = false
    } = meta;
    this.name = name;
    this.isSubtypeOf = isSubtypeOf;
    this.parent = parent;
    this.shouldBeUsedAsGeneric = shouldBeUsedAsGeneric;
  }

  getChangedName<T: Type>(sourceTypes: Array<T>, targetTypes: Array<Type>) {
    let pattern = "";
    const map = sourceTypes.reduce((map, type, index) => {
      const name = String(type.name).replace(
        /[()]/g,
        bracket => `\\${bracket}`
      );
      map.set(name, String(targetTypes[index].name));
      pattern += (pattern && "|") + name.replace(/\|/g, "\\|");
      return map;
    }, new Map());
    const template = new RegExp(`\\b(${pattern})\\b`, "gm");
    return String(this.name).replace(
      template,
      typeName => map.get(typeName) || ""
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
  }

  save() {
    const existed = this.parent.body.get(this.name);
    if (existed === undefined || !(existed instanceof this.constructor)) {
      this.parent.body.set(this.name, this);
    }
    return this;
  }

  referenceEqualsTo(anotherType: Type) {
    return this === anotherType;
  }

  equalsTo(anotherType: Type) {
    return (
      this.referenceEqualsTo(anotherType) || this.name === anotherType.name
    );
  }

  isSuperTypeFor(type: Type): boolean {
    if (this._alreadyProcessedWith === type) {
      return true;
    }
    if (type.isSubtypeOf === null || !this.canContain(type.isSubtypeOf)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result = this.isPrincipalTypeFor(type.isSubtypeOf);
    this._alreadyProcessedWith = null;
    return result;
  }

  getPropertyType(propertyName: mixed): ?Type {
    if (this.isSubtypeOf != null) {
      return this.isSubtypeOf.getPropertyType(propertyName);
    }
    return null;
  }

  isPrincipalTypeFor(type: Type): boolean {
    if ("variants" in type) {
      // $FlowIssue
      return type.variants.every(variant => this.isPrincipalTypeFor(variant));
    }
    return (
      this.equalsTo(Type.Unknown) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this.referenceEqualsTo(type)) {
      return [];
    }
    if ("readonly" in type) {
      // $FlowIssue
      type = type.readonly;
    }
    if ("variants" in type) {
      // $FlowIssue
      const variants = [...type.variants].sort(
        (t1, t2) => t2.priority - t1.priority
      );
      for (const variant of variants) {
        const diff = this.getDifference(variant, withReverseUnion);
        if (diff.length !== 0 || variant.isPrincipalTypeFor(this)) {
          return diff;
        }
      }
      return [];
    }
    if ("constraint" in type && type.isSubtypeOf === null) {
      const constraint =
        // $FlowIssue
        type.constraint instanceof Type ? type.constraint : undefined;
      if (constraint !== undefined && !("subordinateMagicType" in constraint)) {
        return constraint.isPrincipalTypeFor(this)
          ? [{ root: this, variable: type }, ...this.getDifference(constraint)]
          : [];
      }
      return [{ root: this, variable: type }];
    }
    if ("subordinateMagicType" in type) {
      // $FlowIssue
      const unpacked = type.unpack();
      if (!("subordinateMagicType" in unpacked)) {
        return this.getDifference(unpacked, withReverseUnion);
      }
    }
    return [];
  }

  contains(type: Type) {
    return this === type;
  }

  weakContains(type: Type) {
    return this.contains(type);
  }

  getOponentType(
    type: Type,
    withUnpack?: boolean = true,
    withReadonly?: boolean = true
  ) {
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    if (withReadonly && "readonly" in type) {
      // $FlowIssue
      type = type.readonly;
    }
    if ("unpack" in type) {
      // $FlowIssue
      type = withUnpack ? type.unpack() : type.subordinateMagicType;
    }
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    // $FlowIssue
    if ("subordinateType" in type && type.subordinateType !== null) {
      // $FlowIssue
      type = type.subordinateType;
    }
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    if (withReadonly && "readonly" in type) {
      // $FlowIssue
      type = type.readonly;
    }
    return type;
  }

  makeNominal() {}

  setInitialized(propertyName: mixed) {}

  generalize(types: Array<TypeVar>, typeScope: TypeScope) {
    return this;
  }

  containsAsGeneric(type: Type) {
    return false;
  }

  promisify() {
    const Promise = Type.find("Promise");
    return Promise.applyGeneric([this]);
  }

  isPromise() {
    const name = String(this.name);
    return /^Promise/.test(name);
  }

  canContain(type: Type) {
    return this.parent.priority >= type.parent.priority;
  }

  endChanges(result: Type) {
    if (this._changeStack === null) {
      return result;
    }
    const last = this._changeStack.pop();
    if (last === undefined) {
      this._changeStack = null;
      return result;
    }
    // $FlowIssue
    last.root = result;
    last.name = result.name;
    if (this._changeStack !== null && this._changeStack.length === 0) {
      this._changeStack = null;
    }
    return result;
  }

  getNextParent(typeScope: TypeScope) {
    return Type.GlobalTypeScope;
  }

  findPrincipal(type: Type) {
    let principal = { isSubtypeOf: this };
    let isPrincipalFound = false;
    while (
      (principal.isSubtypeOf != undefined ||
        principal === Type.True ||
        principal === Type.False) &&
      !isPrincipalFound
    ) {
      // $FlowIssue We mutate static field Boolean in src/type-graph/types/union-type.js so Boolean should exists in Type
      principal = principal.isSubtypeOf || Type.Boolean;
      isPrincipalFound = principal.isPrincipalTypeFor(type);
    }
    return isPrincipalFound ? principal : undefined;
  }

  asUserDefined() {
    return this;
  }

  asNotUserDefined() {
    return this;
  }
}
