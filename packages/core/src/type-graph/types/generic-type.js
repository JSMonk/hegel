// @flow
import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ModuleScope } from "../module-scope";
import { $BottomType } from "./bottom-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { SourceLocation } from "@babel/parser";

export class GenericType<T: Type> extends Type {
  static createTypeWithName = createTypeWithName(GenericType);

  static getNameWithoutApplying(name: mixed) {
    return String(name).replace(/<.+?>/g, "");
  }

  static getName<T: Type>(name: mixed, parameters: Array<T>) {
    if (parameters.length === 0) {
      return String(name);
    }
    return `${String(name)}<${parameters.reduce(
      (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
      ""
    )}>`;
  }

  genericArguments: Array<TypeVar>;
  subordinateType: T;
  localTypeScope: Scope;

  constructor(
    name: string,
    genericArguments: Array<TypeVar>,
    typeScope: Scope,
    type: T
  ) {
    super(name);
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

  assertParameters(parameters: Array<Type>, loc?: SourceLocation) {
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
    const wrongArgumentIndex = this.genericArguments.findIndex(
      (arg, i) => !arg.isPrincipalTypeFor(parameters[i])
    );
    if (wrongArgumentIndex !== -1) {
      throw new HegelError(
        `Parameter "${getNameForType(
          parameters[wrongArgumentIndex]
        )}" is incompatible with restriction of type argument "${String(
          this.genericArguments[wrongArgumentIndex].name
        )}"`,
        loc
      );
    }
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
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
    return new GenericType(
      newName,
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
    if (this.localTypeScope.parent instanceof ModuleScope) {
      throw new Error("Never!");
    }
    const oldAppliedSelf = new $BottomType(this, this.genericArguments);
    const appliedSelf = new TypeVar(appliedTypeName, null, true);
    const result = this.subordinateType.changeAll(
      [...this.genericArguments, oldAppliedSelf],
      [...parameters, appliedSelf],
      this.localTypeScope.parent
    );
    result.name = result.name === undefined ? appliedTypeName : result.name;
    appliedSelf.root = result;
    return result;
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
