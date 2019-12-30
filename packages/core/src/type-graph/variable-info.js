// @flow
import { Meta } from "./meta/meta";
import type { Type } from "./types/type";
import type { Scope } from "./scope";
import type { ModuleScope } from "./module-scope";

export class VariableInfo {
  type: Type;
  parent: ?Scope | ?ModuleScope;
  isConstant: boolean;
  hasInitializer: boolean;
  meta: Meta;

  constructor(
    type: Type,
    parent: ?Scope | ?ModuleScope,
    meta?: Meta = new Meta(),
    isConstant: boolean = false,
    hasInitializer: boolean = false
  ) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
    this.isConstant = isConstant;
    this.hasInitializer = hasInitializer;
  }
}
