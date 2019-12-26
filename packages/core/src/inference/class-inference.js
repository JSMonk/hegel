// @flow
import NODE from "../utils/nodes";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { THIS_TYPE } from "../type-graph/constants";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableInfo } from "../type-graph/variable-info";
import { addCallToTypeGraph } from "../type-graph/call";
import { getAnonymousKey, findVariableInfo } from "../utils/common";
import type { Handler } from "../utils/traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type { ClassDeclaration, ClassExpression } from "@babel/parser";

export function inferenceClass(
  classNode: ClassDeclaration | ClassExpression,
  typeScope: Scope,
  parentScope: ModuleScope | Scope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
): ObjectType {
  const methods = [];
  const fieldsAndMethods = classNode.body.body.reduce((res, p) => {
    if (p.computed || p.kind === "set") {
      return res;
    }
    const { result: inferencedType } = addCallToTypeGraph(
      p,
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
    if (p.type === NODE.CLASS_METHOD || (p.value && NODE.isFunction(p.value))) {
      varInfo = findVariableInfo(
        { name: getAnonymousKey(p.value || p) },
        parentScope
      );
      methods.push(typeGraph.body.get(Scope.getName(p.value || p)));
    }
    return res.concat([[String(p.key.name || p.key.value), varInfo]]);
  }, []);
  const isSubtypeOf =
    classNode.superClass &&
    findVariableInfo(classNode.superClass, typeScope).type;
  const thisType = ObjectType.createTypeWithName(
    classNode.id ? classNode.id.name : ObjectType.getName(fieldsAndMethods),
    typeScope,
    fieldsAndMethods,
    { isSubtypeOf, isNominal: true }
  );
  methods.forEach(methodScope => {
    if (methodScope instanceof Scope) {
      methodScope.body.set(THIS_TYPE, thisType);
    }
  });
  return thisType;
}
