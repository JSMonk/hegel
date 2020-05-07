// @flow
import { Meta } from "./meta";
import { Type } from "../types/type";
import { GenericType } from "../types/generic-type";
import { FunctionType } from "../types/function-type";
import { VariableInfo } from "../variable-info";
import type { TypeScope } from "../type-scope";
import type { SourceLocation } from "@babel/parser";

export type CallableType = FunctionType | GenericType<FunctionType>;

export type CallableTarget =
  | CallableType
  | {
      type: CallableType
    };

export type CallableArguments = Type | VariableInfo<Type>;

export class CallMeta extends Meta {
  target: ?CallableTarget;
  targetName: string;
  arguments: Array<CallableArguments>;
  argumentsLocations: Array<SourceLocation>;
  inferenced: boolean;
  isFinal: boolean;
  typeScope: TypeScope;

  constructor(
    target: ?CallableTarget,
    args: Array<CallableArguments>,
    loc: SourceLocation,
    targetName: string,
    typeScope: TypeScope,
    inferenced?: boolean = false,
    isFinal?: boolean = false,
    argumentsLocations?: Array<SourceLocation> = []
  ) {
    super(loc);
    this.target = target;
    this.targetName = targetName;
    this.arguments = args;
    this.typeScope = typeScope;
    this.inferenced = inferenced;
    this.isFinal = isFinal;
    this.argumentsLocations = argumentsLocations;
  }
}
