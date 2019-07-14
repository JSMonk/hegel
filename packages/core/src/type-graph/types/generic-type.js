// @flow
import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ModuleScope } from "../module-scope";
import { VariableInfo } from "../variable-info";
import { getNameForType } from "../../utils/type-utils";
import { findVariableInfo } from "../../utils/common";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { SourceLocation } from "@babel/parser";

export class GenericType<T: Type> extends Type {
  static createTypeWithName = createTypeWithName(GenericType);

  static getName(name: mixed, parameters: Array<Type>) {
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
    return this.subordinateType.changeAll(sourceTypes, targetTypes, typeScope);
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
      const variant = t.constraint.variants.find(v =>
        v.isPrincipalTypeFor(appliedType)
      );
      if (variant === undefined) {
        throw new Error("Never!");
      }
      return variant;
    });
    const appliedTypeName = GenericType.getName(this.name, parameters);
    const existedType = this.localTypeScope.parent.body.get(appliedTypeName);
    if (this.localTypeScope.parent instanceof ModuleScope) {
      throw new Error("Never!");
    }
    const result = this.subordinateType.changeAll(
      [...this.genericArguments],
      parameters,
      this.localTypeScope.parent
    );
    return result;
  }
}
