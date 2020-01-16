// @flow
import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { TypeScope } from "../type-scope";
import { $BottomType } from "./bottom-type";
import type { TypeMeta } from "./type";
import type { SourceLocation } from "@babel/parser";

export class GenericType<T: Type> extends Type {
  static term(
    name: mixed,
    meta?: TypeMeta = {},
    genericArguments: Array<TypeVar>,
    typeScope: TypeScope,
    type: T,
    ...args: Array<any>
  ) {
    const newMeta = {
      ...meta,
      parent: type.parent
    };
    return super.term(
      name,
      newMeta,
      genericArguments,
      typeScope,
      type,
      ...args
    );
  }

  static getNameWithoutApplying(name: mixed) {
    return String(name).replace(/<.+>/g, "");
  }

  static getName<T: Type>(name: mixed, parameters: Array<T>) {
    if (parameters.length === 0) {
      return String(name);
    }
    return `${String(name)}<${parameters.reduce(
      (res, t) => `${res}${res ? ", " : ""}${String(t.name)}`,
      ""
    )}>`;
  }

  genericArguments: Array<TypeVar>;
  subordinateType: T;
  localTypeScope: TypeScope;

  constructor(
    name: string,
    meta?: TypeMeta = {},
    genericArguments: Array<TypeVar>,
    typeScope: TypeScope,
    type: T
  ) {
    super(name, meta);
    this.subordinateType = type;
    this.localTypeScope = typeScope;
    this.genericArguments = genericArguments;
  }

  isSuperTypeFor(anotherType: Type) {
    const otherType =
      anotherType instanceof GenericType
        ? anotherType.subordinateType
        : anotherType;
    return this.subordinateType.isSuperTypeFor(otherType);
  }

  assertParameters(
    parameters: Array<Type>,
    loc?: SourceLocation,
    ignoreLength?: boolean = false
  ) {
    if (parameters.length !== this.genericArguments.length) {
      throw new HegelError(
        `Generic "${String(
          this.name
        )}" called with wrong number of arguments. Expect: ${
          this.genericArguments.length
        }, Actual: ${parameters.length}`,
        loc
      );
    }
    const genericArguments = this.genericArguments.map(
      a =>
        a.constraint !== undefined
          ? new TypeVar(
              String(a.name),
              { isSubtypeOf: a.isSubtypeOf, parent: a.parent },
              // $FlowIssue
              a.constraint.changeAll(this.genericArguments, parameters),
              a.isUserDefined
            )
          : a
    );
    const wrongArgumentIndex = genericArguments.findIndex(
      (arg, i) => !arg.isPrincipalTypeFor(parameters[i])
    );
    if (wrongArgumentIndex !== -1) {
      const parameter = parameters[wrongArgumentIndex];
      const typeVar = genericArguments[wrongArgumentIndex];
      throw new HegelError(
        `Parameter "${String(
          parameter.name
        )}" is incompatible with restriction ${
          typeVar.constraint
            ? `"${String(typeVar.constraint.name)}`
            : `of type "${String(typeVar.name)}"`
        }"`,
        loc
      );
    }
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ): Type {
    const newSubordinateType = this.subordinateType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    if (newSubordinateType === this.subordinateType) {
      return this;
    }
    const newGenericArguments = this.genericArguments.filter(arg =>
      newSubordinateType.contains(arg)
    );
    if (newGenericArguments.length === 0) {
      return newSubordinateType;
    }
    const newName =
      "argumentsTypes" in newSubordinateType
        ? newSubordinateType.constructor.getName(
            newSubordinateType.argumentsTypes,
            newSubordinateType.returnType,
            newGenericArguments
          )
        : GenericType.getName(newSubordinateType.name, newGenericArguments);
    return GenericType.term(
      newName,
      {},
      newGenericArguments,
      this.localTypeScope,
      newSubordinateType
    );
  }

  applyGeneric(
    appliedParameters: Array<Type>,
    loc?: SourceLocation,
    shouldBeMemoize?: boolean = true
  ): T {
    this.assertParameters(appliedParameters, loc);
    const parameters: Array<Type> = this.genericArguments.map((t, i) => {
      const appliedType = appliedParameters[i];
      // Needed for type inferencing
      if (
        appliedType instanceof TypeVar &&
        !appliedType.isUserDefined &&
        t.isUserDefined &&
        appliedType.constraint !== t.constraint
      ) {
        return t;
      }
      if (
        t.constraint === undefined ||
        !(t.constraint instanceof UnionType) ||
        appliedType.equalsTo(t)
      ) {
        return appliedType;
      }
      if (
        t.constraint instanceof UnionType &&
        appliedType instanceof UnionType
      ) {
        return appliedType;
      }
      const variant = t.constraint.variants.find(v =>
        v.isPrincipalTypeFor(appliedType)
      );
      if (variant === undefined) {
        throw new Error("Never!");
      }
      return variant;
    });
    const appliedTypeName = GenericType.getName(this.name, parameters);
    const oldAppliedSelf = new $BottomType({}, this, this.genericArguments);
    const localTypeScope = new TypeScope(this.localTypeScope);
    const appliedSelf = TypeVar.term(
      appliedTypeName,
      { parent: localTypeScope, isSubtypeOf: TypeVar.Self },
      null,
      true
    );
    if (!(appliedSelf instanceof TypeVar)) {
      return appliedSelf;
    }
    const result = this.subordinateType.changeAll(
      [...this.genericArguments, oldAppliedSelf],
      [...parameters, appliedSelf],
      localTypeScope
    );
    result.name = result.name === undefined ? appliedTypeName : result.name;
    appliedSelf.root = result;
    return result.save();
  }

  getPropertyType(propertyName: mixed): ?Type {
    const result = this.subordinateType.getPropertyType(propertyName);
    if (result === null && this.isSubtypeOf != null) {
      return this.isSubtypeOf.getPropertyType(propertyName);
    }
    return result;
  }

  getDifference(type: Type) {
    if (type instanceof GenericType) {
      return this.subordinateType.getDifference(type.subordinateType);
    }
    if (type instanceof TypeVar) {
      return super.getDifference(type);
    }
    return this.subordinateType.getDifference(type);
  }

  contains(type: Type) {
    return super.contains(type) || this.subordinateType.contains(type);
  }

  weakContains(type: Type) {
    return super.contains(type) || this.subordinateType.weakContains(type);
  }

  makeNominal() {
    this.subordinateType.makeNominal();
  }

  containsAsGeneric(type: Type) {
    return this.genericArguments.includes(type);
  }
}
