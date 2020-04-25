// @flow
import { Meta } from "./meta/meta";
import type { Type } from "./types/type";
import type { ModuleScope } from "./module-scope";
import type { VariableScope } from "./variable-scope";

export class VariableInfo<T: Type> {
  type: T;
  parent: VariableScope | ModuleScope;
  isConstant: boolean = false;
  hasInitializer: boolean = false;
  isInferenced: boolean = false;
  isPrivate: boolean = false;
  meta: Meta;

  constructor(
    type: T,
    parent: VariableScope | ModuleScope,
    meta?: Meta = new Meta(),
    isConstant: boolean = false,
    isInferenced: boolean = false,
    isPrivate: boolean = false
  ) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
    this.isConstant = isConstant;
    this.isInferenced = isInferenced;
    this.isPrivate = isPrivate;
  }
}
