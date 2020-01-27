// @flow
import _HegelError from "./utils/errors";
import { Type as _Type } from "./type-graph/types/type";
import { TypeScope as _TypeScope } from "./type-graph/type-scope";
import { VariableInfo as _VariableInfo } from "./type-graph/variable-info";
import { VariableScope as _VariableScope } from "./type-graph/variable-scope";
import {
  ModuleScope as _ModuleScope,
  PositionedModuleScope as _PositionedModuleScope
} from "./type-graph/module-scope";
import _createGlobalScope, {
  createModuleScope as _createModuleScope
} from "./type-graph/type-graph";

export const TypeScope = _TypeScope;
export const VariableScope = _VariableScope;
export const ModuleScope = _ModuleScope;
export const PositionedModuleScope = _PositionedModuleScope;
export const Type = _Type;
export const VariableInfo = _VariableInfo;
export const HegelError = _HegelError;
export const createGlobalScope = _createGlobalScope;
export const createModuleScope = _createModuleScope;
