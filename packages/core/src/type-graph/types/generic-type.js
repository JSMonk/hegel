// @flow
import HegelError from "../../utils/errors";
import { Type } from "./type";
import { ModuleScope } from "../module-scope";
import { VariableInfo } from "../variable-info";
import { getNameForType } from "../../utils/type-utils";
import { findVariableInfo } from "../../utils/common";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeVar } from "./type-var";
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

  genericArguments: Array<Type>;
  subordinateType: T;
  localTypeScope: Scope;

  constructor(
    name: string,
    genericArguments: Array<Type>,
    typeScope: Scope,
    type: T
  ) {
    super(name);
    this.subordinateType = type;
    this.localTypeScope = typeScope;
    this.genericArguments = genericArguments;
  }

  isSuperTypeFor(anotherType: Type) {
    return this.subordinateType.isSuperTypeFor(anotherType);
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
    parameters: Array<Type>,
    loc?: SourceLocation,
    shouldBeMemoize?: boolean = true
  ): T {
    this.assertParameters(parameters, loc);
    const appliedTypeName = GenericType.getName(this.name, parameters);
    const existedType = this.localTypeScope.parent.body.get(appliedTypeName);
    if (existedType && existedType instanceof VariableInfo) {
      return (existedType.type: any);
    }
    if (this.localTypeScope.parent instanceof ModuleScope) {
      throw new Error("Never!");
    }
    const result = this.subordinateType.changeAll(
      this.genericArguments,
      parameters,
      this.localTypeScope.parent
    );
    if (shouldBeMemoize) {
      this.localTypeScope.parent.body.set(
        appliedTypeName,
        findVariableInfo(
          { name: getNameForType(result) },
          this.localTypeScope.parent
        )
      );
    }
    return result;
  }
}
