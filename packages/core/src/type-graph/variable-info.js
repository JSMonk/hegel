// @flow
import { Meta } from "./meta/meta";
import type { Type } from "./types/type";
import type { ModuleScope } from "./module-scope";
import type { VariableScope } from "./variable-scope";

export class VariableInfo {
  type: Type;
  parent: VariableScope | ModuleScope | void;
  isConstant: boolean = false;
  hasInitializer: boolean = false;
  meta: Meta;

  constructor(
    type: Type,
    parent: VariableScope | ModuleScope | void,
    meta?: Meta = new Meta(),
    isConstant: boolean = false
  ) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
    this.isConstant = isConstant;
  }
}
