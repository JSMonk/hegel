// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { TupleType } from "../type-graph/types/tuple-type";
import { ObjectType } from "../type-graph/types/object-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { CONSTRUCTABLE } from "../type-graph/constants";
import { CollectionType } from "../type-graph/types/collection-type";
import { $AppliedImmutable } from "../type-graph/types/immutable-type";
import { getDeclarationName } from "./common";
import { PositionedModuleScope } from "../type-graph/module-scope";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { getParentForNode, findNearestTypeScope } from "./scope-utils";
import type { Handler } from "./traverse";
import type { TypeScope } from "../type-graph/type-scope";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  ClassMethod,
  ArrayPattern,
  ObjectMethod,
  ClassProperty,
  ObjectPattern,
  ObjectProperty,
} from "@babel/parser";

export function getPropertyName(
  node: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  addCallToTypeGraph?: (ClassProperty | ObjectProperty | ClassMethod | ObjectMethod) => { result: Type | VariableInfo<any> }
) {
  const isPrivate =
    node.type === NODE.CLASS_PRIVATE_METHOD ||
    node.type === NODE.CLASS_PRIVATE_PROPERTY;
  if (isPrivate) {
    return `#${node.key.id.name}`;
  }
  if (node.kind === "constructor") {
    return CONSTRUCTABLE;
  }
  if (node.computed && addCallToTypeGraph !== undefined) {
    const { result } = addCallToTypeGraph(node.key);
    let type = result instanceof VariableInfo ? result.type : result;
    type = type.getOponentType(type);
    const availableTypes = UnionType.term(null, {}, [Type.String, Type.Number, Type.Symbol]);
    if (availableTypes.isPrincipalTypeFor(type)) {
      if (type instanceof TypeVar || type.isSubtypeOf === Type.Symbol) {
        return type;
      }
      if (type.isSubtypeOf === Type.String) {
        return String(type.name).slice(1, -1);
      }
      if (type.isSubtypeOf === Type.Number) {
        return String(type.name);
      }
      if (
          !(type instanceof UnionType) &&
          type !== Type.String &&
          type !== Type.Number &&
          type !== Type.Symbol
        ) {
        return String(type.name);
      }
    }
    if (type instanceof TypeVar && !type.isUserDefined && type.constraint === undefined) {
      type.constraint = availableTypes;
      return type;
    }
    throw new HegelError(
      `Only string, symbol or number values are available for object property constructing, your type is: ${String(type.name)}`,
      node.key.loc
    );
  } 
  return node.key.name || `${node.key.value}`;
}

export function getVariableInfoFromDelcaration(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  const parentScope = getParentForNode(currentNode, parentNode, typeGraph);
  const currentTypeScope = findNearestTypeScope(parentScope, typeGraph);
  const annotatedType = getTypeFromTypeAnnotation(
    currentNode.id && currentNode.id.typeAnnotation,
    currentTypeScope,
    parentScope,
    false,
    null,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute
  );
  return new VariableInfo<Type>(
    annotatedType,
    parentScope,
    new Meta(currentNode.loc),
    currentNode.kind === "const"
  );
}

export function getSuperTypeOf(
  type: Type,
  typeScope: TypeScope,
  withUnion: boolean = false
): Type {
  if (type === Type.True || type === Type.False) {
    return UnionType.Boolean;
  }
  if (type instanceof UnionType) {
    return withUnion
      ? UnionType.term(
          null,
          {},
          type.variants.map(variant =>
            getSuperTypeOf(variant, typeScope, withUnion)
          )
        )
      : type;
  }
  if (
    type.isSubtypeOf == undefined ||
    type.name === null ||
    type instanceof FunctionType ||
    (type instanceof ObjectType && String(type.name)[0] !== "{")
  ) {
    return type;
  }
  if (type instanceof TupleType) {
    // $FlowIssue Array is always GenericType
    return CollectionType.Array.root.applyGeneric([
      getSuperTypeOf(
        type.items.length === 0
          ? Type.Unknown
          : UnionType.term(
              null,
              {},
              type.items.map(a => getSuperTypeOf(a, typeScope, withUnion))
            ),
        typeScope,
        true
      )
    ]);
  }
  if (type instanceof ObjectType) {
    const propertyTypes = [...type.properties.entries()].map(([key, v]) => [
      key,
      v.type
    ]);
    const newProperties = propertyTypes.map(([key, p]) => [
      key,
      // $FlowIssue
      Object.assign(new VariableInfo(), type.properties.get(key), {
        type: getSuperTypeOf(p, typeScope, withUnion)
      })
    ]);
    return ObjectType.term(
      ObjectType.getName(newProperties),
      {},
      newProperties
    );
  }
  return type.isSubtypeOf;
}

export function getVariableType(
  variable: VariableInfo<Type> | void,
  newType: Type,
  typeScope: TypeScope,
  inferenced: boolean = false,
  freezed: boolean = false
): Type {
  if (variable && variable.type !== Type.Unknown) {
    return variable.type;
  }
  if (
    !inferenced ||
    newType instanceof $AppliedImmutable ||
    (variable &&
      variable.isConstant &&
      (newType.constructor === Type || newType.constructor === TupleType))
  ) {
    return newType;
  }
  return getSuperTypeOf(newType, typeScope);
}

export function addVariableToGraph(
  currentNode: Node,
  parentNode: ?Node,
  moduleScope: ModuleScope | PositionedModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler,
  customName?: string = getDeclarationName(currentNode)
) {
  const variableInfo = getVariableInfoFromDelcaration(
    currentNode,
    parentNode,
    moduleScope,
    precompute,
    middlecompute,
    postcompute
  );
  variableInfo.parent.body.set(customName, variableInfo);
  if (moduleScope instanceof PositionedModuleScope && currentNode.id != null) {
    moduleScope.addPosition(currentNode.id, variableInfo);
  }
  return variableInfo;
}
