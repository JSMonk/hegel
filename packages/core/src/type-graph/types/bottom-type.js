import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { TypeScope } from "../type-scope";
import { FunctionType } from "./function-type";

export class $BottomType extends Type {
  static get name() {
    return "$BottomType";
  }

  static getParent(meta, _, genericArguments = []) {
    return genericArguments.reduce(
      (parent, type) =>
        parent.priority < type.parent.priority ? type.parent : parent,
      meta.parent || Type.GlobalTypeScope
    );
  }

  static new(name, meta = {}, ...args) {
    const parent = this.getParent(meta, ...args);
    const newMeta = { ...meta, parent };
    const newType = new this(newMeta, ...args);
    parent.body.set(name, newType);
    return newType;
  }

  static getName(name, parameters) {
    name = name.replace(/<.+>/g, "");
    if (parameters.length === 0) {
      return String(name);
    }
    return `${String(name)}<${parameters.reduce(
      (res, t) => `${res}${res ? ", " : ""}${String(Type.getTypeRoot(t).name)}`,
      ""
    )}>`;
  }

  constructor(meta, subordinateMagicType, genericArguments = [], loc) {
    meta = {
      ...meta,
      parent: $BottomType.getParent(
        meta,
        subordinateMagicType,
        genericArguments
      )
    };
    super(
      $BottomType.getName(subordinateMagicType.name, genericArguments),
      meta
    );
    this.subordinateMagicType = subordinateMagicType;
    this.genericArguments = genericArguments;
    this.loc = loc;
    this.priority = subordinateMagicType.priority + 1;
    this.isForAssign = meta.isForAssign;
  }

  changeAll(sourceTypes, targetTypes, typeScope) {
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    const currentSelf = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    if (
      this._changeStack !== null &&
      this._changeStack.find(a => a.equalsTo(currentSelf))
    ) {
      return currentSelf;
    }
    this._changeStack =
      this._changeStack === null
        ? [currentSelf]
        : [...this._changeStack, currentSelf];
    let includedUndefined = false;
    let includedBottom = false;
    let includedTypeVar = false;
    const includedSelfIndex = sourceTypes.findIndex(t => this.equalsTo(t));
    if (includedSelfIndex !== -1) {
      return this.endChanges(targetTypes[includedSelfIndex]);
    }
    const mapper = argument => {
      if (argument instanceof $BottomType) {
        const newType = argument.changeAll(sourceTypes, targetTypes, typeScope);
        includedBottom = true;
        return newType !== argument ? newType : undefined;
      }

      if (argument instanceof TypeVar) {
        const argumentIndex = sourceTypes.findIndex(
          a =>
            argument instanceof $BottomType
              ? argument.subordinateType === a
              : a.equalsTo(argument)
        );
        const result = argumentIndex === -1
          ? undefined 
          : sourceTypes[argumentIndex].changeAll(sourceTypes, targetTypes, typeScope);
        if (result === undefined) {
          includedUndefined = true;
        }
        if (result instanceof TypeVar && !TypeVar.isSelf(result)) {
          includedTypeVar = true;
        }
        return result;
      }
      if (argument instanceof UnionType) {
        const newType = argument.changeAll(sourceTypes, targetTypes, typeScope);
        if (newType.parent.priority > TypeScope.MODULE_SCOPE_PRIORITY) {
          includedTypeVar = true;
        }
        return newType;
      }
      return argument;
    };
    try {
      const appliedParameters = this.genericArguments.map(mapper);
      if (appliedParameters.every(a => a === undefined)) {
        return this.endChanges(this);
      }
      if (includedUndefined) {
        const type = this.subordinateMagicType.changeAll(
          sourceTypes,
          targetTypes,
          typeScope
        );
        return this.endChanges(
          new $BottomType({}, type, type.genericArguments, this.loc)
        );
      }
      if (includedBottom || includedTypeVar) {
        return this.endChanges(
          new $BottomType(
            {},
            this.subordinateMagicType,
            appliedParameters,
            this.loc
          )
        );
      }
      const target =
        this.subordinateMagicType instanceof TypeVar &&
        this.subordinateMagicType.root != undefined
          ? this.subordinateMagicType.root
          : this.subordinateMagicType;
      return this.endChanges(
        target.applyGeneric(
          appliedParameters,
          this.loc,
          false,
          false,
          this.isForASsign
        )
      );
    } catch (e) {
      this._changeStack = null;
      throw e;
    }
  }

  unpack(loc = this.loc) {
    const target =
      this.subordinateMagicType instanceof TypeVar &&
      this.subordinateMagicType.root != undefined
        ? Type.getTypeRoot(this.subordinateMagicType)
        : this.subordinateMagicType;
    if ("subordinateType" in target) {
      const parameters = this.genericArguments.map(t => {
        if (t instanceof $BottomType) {
          t = t.unpack(loc);
        }
        if (t instanceof TypeVar && t.root !== undefined) {
          t = Type.getTypeRoot(t);
        }
        return t;
      });
      return target.applyGeneric(parameters, loc, true, true, this.isForAssign);
    }
    throw new Error(`Never!!! ${target.constructor.name}`);
  }

  isPrincipalTypeFor(other: Type): boolean {
    if (this._alreadyProcessedWith === other || this.equalsTo(other)) {
      return true;
    }
    this._alreadyProcessedWith = other;
    const self = this.unpack();
    if (self instanceof $BottomType) {
      return super.isPrincipalTypeFor(other);
    }
    const result = self.isPrincipalTypeFor(other);
    this._alreadyProcessedWith = null;
    return result;
  }

  applyGeneric(parameters, loc, shouldBeMemoize, isCalledAsBottom, ...args) {
    const returnType = parameters.some(
      p => p instanceof TypeVar && p.isUserDefined
    )
      ? new $BottomType({}, this.subordinateMagicType, parameters, loc)
      : this.subordinateMagicType.applyGeneric(
          parameters,
          loc,
          shouldBeMemoize,
          true,
          this.isForAssign
        );
    return FunctionType.term(
      FunctionType.getName(parameters, returnType),
      {},
      parameters,
      returnType
    );
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    if (type instanceof TypeVar) {
      return [{ root: this, variable: type }];
    }
    if (type instanceof $BottomType) {
      type = type.subordinateMagicType;
    }
    const subordinate = this.getOponentType(this.subordinateMagicType);
    this._alreadyProcessedWith = type;
    const diff = subordinate.getDifference(type, withReverseUnion);
    this._alreadyProcessedWith = null;
    return "genericArguments" in subordinate
      ? diff.map(diff => {
          const index = subordinate.genericArguments.indexOf(diff.variable);
          if (index === -1) {
            return diff;
          }
          return { variable: this.genericArguments[index], root: diff.root };
        })
      : diff;
  }

  getRootedSubordinateType() {
    const { subordinateMagicType } = this;
    if ("subordinateType" in subordinateMagicType) {
      subordinateMagicType.genericArguments.forEach((arg, index) => {
        arg.root = this.genericArguments[index];
      });
    }
    return subordinateMagicType;
  }

  unrootSubordinateType() {
    const { subordinateMagicType } = this;
    if ("subordinateType" in subordinateMagicType) {
      subordinateMagicType.genericArguments.forEach((arg, index) => {
        arg.root = undefined;
      });
    }
  }

  equalsTo(type: Type) {
    if (this.referenceEqualsTo(type)) {
      return true;
    }
    if (this._alreadyProcessedWith === type) {
      return true;
    }
    this._alreadyProcessedWith = type;
    const result =
      type instanceof $BottomType &&
      this.canContain(type) &&
      this.genericArguments.length === type.genericArguments.length &&
      this.genericArguments.every((arg, i) =>
        arg.equalsTo(type.genericArguments[i])
      ) &&
      Type.getTypeRoot(this.subordinateMagicType) ===
        Type.getTypeRoot(type.subordinateMagicType);
    this._alreadyProcessedWith = null;
    return result;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      this.genericArguments.some(a => a.contains(type)) ||
      this.subordinateMagicType.contains(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      this.genericArguments.some(a => a.weakContains(type)) ||
      this.subordinateMagicType.weakContains(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  makeNominal() {
    this.subordinateMagicType.makeNominal();
  }

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = [...this.genericArguments]
      .map(a => a.getNextParent(typeScope))
      .sort((a, b) => b.priority - a.priority);
    for (const parent of sortedParents) {
      if (parent.priority <= typeScope.priority && parent !== typeScope) {
        this._alreadyProcessedWith = null;
        return parent;
      }
    }
    this._alreadyProcessedWith = null;
    return Type.GlobalTypeScope;
  }
}
