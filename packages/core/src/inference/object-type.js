// @flow
import NODE from "../utils/nodes";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { ObjectType } from "../type-graph/types/object-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { addCallToTypeGraph } from "../type-graph/call";
import { getAnonymousKey, findVariableInfo } from "../utils/common";
import type { Handler } from "../utils/traverse";
import type { ObjectExpression } from "@babel/parser";

export function inferenceObjectType(
  currentNode: ObjectExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
): ObjectType {
  const properties = currentNode.properties.reduce((res, p) => {
    if (p.computed || p.kind === "set") {
      return res;
    }
    const { result: inferencedType } = addCallToTypeGraph(
      p.type === NODE.OBJECT_PROPERTY || p.type === NODE.TS_OBJECT_PROPERTY
        ? p.value
        : p,
      typeGraph,
      parentScope,
      parentNode,
      pre,
      middle,
      post
    );
    let varInfo = new VariableInfo(
      inferencedType instanceof VariableInfo
        ? inferencedType.type
        : inferencedType,
      parentScope,
      new Meta(p.loc)
    );
    if (
      p.type === NODE.OBJECT_METHOD ||
      p.type === NODE.TS_OBJECT_METHOD ||
      (p.value && NODE.isFunction(p.value))
    ) {
      varInfo = findVariableInfo(
        { name: getAnonymousKey(p.value || p) },
        parentScope
      );
    }
    return res.concat([[String(p.key.name || p.key.value), varInfo]]);
  }, []);
  return ObjectType.createTypeWithName(
    ObjectType.getName(properties),
    typeScope,
    properties,
    { isSubtypeOf: findVariableInfo({ name: "Object" }, typeScope).type }
  );
}
