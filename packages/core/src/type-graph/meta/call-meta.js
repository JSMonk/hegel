// @flow
import { Meta } from "./meta";
import { Type } from "../types/type";
import { GenericType } from "../types/generic-type"; 
import { FunctionType } from "../types/function-type"; 
import { VariableInfo } from "../variable-info";
import type { SourceLocation } from "@babel/parser"; 

export type CallableTarget = {
  type: FunctionType | GenericType<FunctionType>
};

export type CallableArguments = Type | VariableInfo;

export class CallMeta extends Meta {
  target: CallableTarget;
  targetName: string;
  arguments: Array<CallableArguments>;

  constructor(
    target: CallableTarget,
    args: Array<CallableArguments>,
    loc: SourceLocation,
    targetName: string
  ) {
    super(loc);
    this.target = target;
    this.targetName = targetName;
    this.arguments = args;
  }
}

