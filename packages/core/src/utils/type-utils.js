// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { unique } from "./common";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { UnionType } from "../type-graph/types/union-type";
import { $Immutable } from "../type-graph/types/immutable-type";
import { ObjectType } from "../type-graph/types/object-type";
import { $BottomType } from "../type-graph/types/bottom-type";
import { GenericType } from "../type-graph/types/generic-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { $Intersection } from "../type-graph/types/intersection-type";
import { CollectionType } from "../type-graph/types/collection-type";
import { getDeclarationName } from "./common";
import { FunctionType, RestArgument } from "../type-graph/types/function-type";
import { CALLABLE, INDEXABLE, CONSTRUCTABLE } from "../type-graph/constants";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type { Node, TypeAnnotation, SourceLocation } from "@babel/parser";

export function addTypeNodeToTypeGraph(
  currentNode: Node,
  typeGraph: ModuleScope
) {
  const name = getDeclarationName(currentNode);
  typeGraph.typeScope.body.set(name, currentNode);
}

export function isReachableType(type: Type, typeScope: TypeScope) {
  let reachableType = null;
  try {
    reachableType = Type.find(type.name, { parent: typeScope });
  } catch {}
  return reachableType !== null && type.equalsTo(reachableType);
}

export function addTypeVar(
  name: string,
  localTypeScope: TypeScope,
  constraint: ?Type,
  defaultType: ?Type,
  isUserDefined?: boolean = false
): TypeVar {
  return TypeVar.new(
    name,
    { parent: localTypeScope },
    constraint,
    defaultType,
    isUserDefined
  );
}

function nullable(annotation: Node) {
  return annotation.optional
    ? {
        typeAnnotation: {
          ...annotation.typeAnnotation,
          type: NODE.NULLABLE_TYPE_ANNOTATION
        }
      }
    : annotation.typeAnnotation;
}

export function getTypeFromTypeAnnotation(
  typeNode: ?TypeAnnotation,
  typeScope: TypeScope,
  currentScope: VariableScope | ModuleScope,
  rewritable: ?boolean = true,
  self: ?Type = null,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler,
  customName?: string
): Type {
  if (!typeNode || !typeNode.typeAnnotation) {
    return Type.Unknown;
  }
  if (typeNode.typeAnnotation.type === NODE.TS_PARENTHESIZED_TYPE) {
    typeNode.typeAnnotation = typeNode.typeAnnotation.typeAnnotation;
  }
  switch (typeNode.typeAnnotation.type) {
    case NODE.ARRAY_TYPE_ANNOTATION:
      const elementType = getTypeFromTypeAnnotation(
        { typeAnnotation: typeNode.typeAnnotation.elementType },
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      throw new HegelError(
        `Array type annotation is not existed in Hegel. Use Array<${String(
          elementType.name
        )}> instead.`,
        typeNode.typeAnnotation.loc
      );
    case NODE.THIS_TYPE_ANNOTATION:
    case NODE.TS_THIS_TYPE_ANNOTATION:
      if (self === null || self === undefined) {
        throw new HegelError(
          "Can not use `this` type without context",
          typeNode.loc
        );
      }
      return self;
    case NODE.TS_TYPE_OPERATOR:
      const res = getTypeFromTypeAnnotation(
        { typeAnnotation: typeNode.typeAnnotation.typeAnnotation },
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      return typeNode.typeAnnotation.operator === "readonly"
        ? Type.find($Immutable.name).applyGeneric(
            [res],
            typeNode.typeAnnotation.loc
          )
        : res;
    case NODE.TS_LITERAL_TYPE:
      return getTypeFromTypeAnnotation(
        { typeAnnotation: typeNode.typeAnnotation.literal },
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
    case NODE.ANY_TYPE_ANNOTATION:
      throw new HegelError(
        'There is no "any" type in Hegel.',
        typeNode.typeAnnotation.loc
      );
    case NODE.TYPEOF_TYPE_ANNOTATION:
      throw new HegelError(
        "typeof for types is not existed in Hegel. Use magic type $TypeOf instead.",
        typeNode.typeAnnotation.loc
      );
    case NODE.TS_SYMBOL_TYPE_ANNOTATION:
      return Type.Symbol;
    case NODE.TS_BIGINT_TYPE_ANNOTATION:
      return Type.BigInt;
    case NODE.TS_UNDEFINED_TYPE_ANNOTATION:
      return Type.Undefined;
    case NODE.TS_OBJECT_KEYWORD:
      return ObjectType.Object;
    case NODE.VOID_TYPE_ANNOTATION:
    case NODE.TS_VOID_TYPE_ANNOTATION:
      return Type.Undefined;
    case NODE.BOOLEAN_TYPE_ANNOTATION:
    case NODE.TS_BOOLEAN_TYPE_ANNOTATION:
      return Type.Boolean;
    case NODE.TS_ANY_TYPE_ANNOTATION:
    case NODE.MIXED_TYPE_ANNOTATION:
    case NODE.TS_UNKNOWN_TYPE_ANNOTATION:
    case NODE.TS_ANY_TYPE_ANNOTATION:
      return Type.Unknown;
    case NODE.EMPTY_TYPE_ANNOTATION:
    case NODE.TS_NEVER_TYPE_ANNOTATION:
      return Type.Never;
    case NODE.NUMBER_TYPE_ANNOTATION:
    case NODE.TS_NUMBER_TYPE_ANNOTATION:
      return Type.Number;
    case NODE.STRING_TYPE_ANNOTATION:
    case NODE.TS_STRING_TYPE_ANNOTATION:
      return Type.String;
    case NODE.NULL_LITERAL_TYPE_ANNOTATION:
    case NODE.TS_NULL_LITERAL_TYPE_ANNOTATION:
      return Type.Null;
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
    case NODE.NUMERIC_LITERAL:
      return Type.term(typeNode.typeAnnotation.value, {
        isSubtypeOf: Type.Number
      });
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
    case NODE.BOOLEAN_LITERAL:
      return Type.term(typeNode.typeAnnotation.value, {
        isSubtypeOf: Type.Boolean
      });
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
    case NODE.STRING_LITERAL:
      return Type.term(`'${typeNode.typeAnnotation.value}'`, {
        isSubtypeOf: Type.String
      });
    case NODE.TS_SYMBOL_TYPE_ANNOTATION:
      return Type.Symbol;
    case NODE.TS_INTERSECTION_TYPE:
      const objects = typeNode.typeAnnotation.types.map(typeAnnotation =>
        getTypeFromTypeAnnotation(
          { typeAnnotation },
          typeScope,
          currentScope,
          rewritable,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        )
      );
      return Type.find("$Intersection").applyGeneric(objects, typeNode.loc);
    case NODE.NULLABLE_TYPE_ANNOTATION:
      const resultType = getTypeFromTypeAnnotation(
        typeNode.typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      return UnionType.term(null, {}, [resultType, Type.Undefined]);
    case NODE.TS_OBJECT_PROPERTY:
      const result = getTypeFromTypeAnnotation(
        // Ohhh, TS is beautiful ❤️
        nullable(typeNode.typeAnnotation),
        typeScope,
        currentScope,
        false,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      return typeNode.typeAnnotation.readonly
        ? Type.find($Immutable.name).applyGeneric(
            [result],
            typeNode.typeAnnotation.loc
          )
        : result;
    case NODE.UNION_TYPE_ANNOTATION:
    case NODE.TS_UNION_TYPE_ANNOTATION:
      const unionVariants = typeNode.typeAnnotation.types.map(typeAnnotation =>
        getTypeFromTypeAnnotation(
          { typeAnnotation },
          typeScope,
          currentScope,
          false,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        )
      );
      return UnionType.term(null, {}, unionVariants);
    case NODE.TUPLE_TYPE_ANNOTATION:
    case NODE.TS_TUPLE_TYPE_ANNOTATION:
      const tupleVariants = (
        typeNode.typeAnnotation.types || typeNode.typeAnnotation.elementTypes
      ).map(typeAnnotation =>
        getTypeFromTypeAnnotation(
          { typeAnnotation },
          typeScope,
          currentScope,
          false,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        )
      );
      return TupleType.term(
        TupleType.getName(tupleVariants),
        {},
        tupleVariants
      );
    case NODE.TYPE_PARAMETER:
    case NODE.TS_TYPE_PARAMETER:
      const constraint =
        typeNode.typeAnnotation.bound &&
        getTypeFromTypeAnnotation(
          typeNode.typeAnnotation.bound,
          typeScope,
          currentScope,
          false,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
      const defaultType =
        typeNode.typeAnnotation.default &&
        getTypeFromTypeAnnotation(
          { typeAnnotation: typeNode.typeAnnotation.default },
          typeScope,
          currentScope,
          false,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
      if (
        constraint &&
        defaultType &&
        !constraint.isPrincipalTypeFor(defaultType)
      ) {
        throw new HegelError(
          `Type "${String(
            defaultType.name
          )}" is incompatible with type "${String(constraint.name)}"`,
          typeNode.typeAnnotation.default.loc
        );
      }
      return addTypeVar(
        typeNode.typeAnnotation.name,
        typeScope,
        constraint,
        defaultType,
        true
      );
    case NODE.TS_INDEX_PROPERTY:
      const key = getTypeFromTypeAnnotation(
        typeNode.typeAnnotation.parameters[0].typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      const value = getTypeFromTypeAnnotation(
        // Ohhh, TS is beautiful ❤️
        typeNode.typeAnnotation.typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      return new CollectionType(
        "",
        {
          parent:
            key.parent.priority > value.parent.priority
              ? key.parent
              : value.parent
        },
        key,
        value
      );
    case NODE.OBJECT_TYPE_ANNOTATION:
    case NODE.TS_OBJECT_TYPE_ANNOTATION:
    case NODE.TS_INTERFACE_DECLARATION:
      const { typeAnnotation: annotation } = typeNode;
      const objectBody = annotation.body || annotation;
      const isSoft =
        annotation.type === NODE.TS_INTERFACE_DECLARATION || annotation.inexact;
      const properties =
        objectBody.properties || objectBody.body || objectBody.members;
      const superTypes = (annotation.extends || []).map(node =>
        getTypeFromTypeAnnotation(
          { typeAnnotation: node },
          typeScope,
          currentScope,
          rewritable,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        )
      );
      const isNotTypeDefinition =
        annotation.type === NODE.OBJECT_TYPE_ANNOTATION;
      const params = properties.flatMap(property => {
        if (property.type === NODE.OBJECT_TYPE_SPREAD_PROPERTY) {
          const spreadType = getTypeFromTypeAnnotation(
            { typeAnnotation: property.argument },
            typeScope,
            currentScope,
            rewritable,
            self,
            parentNode,
            typeGraph,
            precompute,
            middlecompute,
            postcompute
          );
          if (!(spreadType instanceof ObjectType)) {
            throw new HegelError("Cannot spread non-object type", property.loc);
          }
          return [...spreadType.properties];
        }
        if (isNotTypeDefinition && property.optional) {
          throw new HegelError(
            "Hegel has not optional property syntax. Use optional type instead.",
            property.loc
          );
        }
        return [
          [
            getPropertyName(property),
            getTypeFromTypeAnnotation(
              { typeAnnotation: property.value || property },
              typeScope,
              currentScope,
              rewritable,
              self,
              parentNode,
              typeGraph,
              precompute,
              middlecompute,
              postcompute
            )
          ]
        ];
      });
      if (customName === undefined) {
        customName =
          annotation.id != undefined
            ? annotation.id.name
            : ObjectType.getName(params, undefined, isSoft);
      }
      const resultObj = ObjectType.term(
        customName,
        { isSoft },
        params
          .map(([name, type]) => [
            name,
            type instanceof VariableInfo
              ? type
              : new VariableInfo(type, currentScope)
          ])
          .concat(
            superTypes.reduce(
              (res, type, index) =>
                res.concat([
                  ...getPropertiesForType(type, annotation.extends[index])
                ]),
              []
            )
          )
      );
      const constructor = resultObj.properties.get(CONSTRUCTABLE);
      if (constructor !== undefined) {
        const constructorType =
          constructor.type instanceof GenericType
            ? constructor.type.subordinateType
            : constructor.type;
        resultObj.instanceType = constructorType.returnType;
      }
      return getResultObjectType(resultObj);
    case NODE.TS_ARRAY_TYPE_ANNOTATION:
      return getTypeFromTypeAnnotation(
        {
          typeAnnotation: {
            type: NODE.TS_TYPE_REFERENCE_ANNOTATION,
            id: { name: "Array" },
            typeParameters: { params: [typeNode.typeAnnotation.elementType] }
          }
        },
        typeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
    case NODE.TS_TYPE_QUERY:
      typeNode.typeAnnotation = {
        loc: typeNode.typeAnnotation.loc,
        type: NODE.GENERIC_TYPE_ANNOTATION,
        id: { name: "$TypeOf" },
        typeParameters: { params: [{ id: typeNode.typeAnnotation.exprName }] }
      };
    case NODE.GENERIC_TYPE_ANNOTATION:
    case NODE.CLASS_IMPLEMENTS:
    case NODE.TS_TYPE_REFERENCE_ANNOTATION:
    case NODE.TS_EXPRESSION_WITH_TYPE_ARGUMENTS:
      const target = typeNode.typeAnnotation || typeNode;
      const genericArguments =
        target.typeParameters && target.typeParameters.params;
      const genericName = (target.id || target.typeName || target.expression)
        .name;
      if (genericArguments != undefined) {
        const typeInScope = Type.find(
          genericName,
          { parent: typeScope, loc: target.loc },
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        const existedGenericType =
          typeInScope instanceof TypeVar && typeInScope.root != undefined
            ? typeInScope.root
            : typeInScope;
        if (
          !existedGenericType ||
          (!(existedGenericType instanceof GenericType) &&
            !TypeVar.isSelf(existedGenericType))
        ) {
          throw new HegelError(
            `Apply undeclareted generic type '${genericName}'`,
            typeNode.typeAnnotation.loc
          );
        }
        if (existedGenericType.name === "$TypeOf") {
          if (
            genericArguments.length !== 1 ||
            (genericArguments[0].id == undefined ||
              genericArguments[0].id.type !== NODE.IDENTIFIER)
          ) {
            throw new HegelError(
              `"${existedGenericType.name}" work only with identifier`,
              typeNode.typeAnnotation.loc
            );
          }
          return existedGenericType.applyGeneric(
            // $FlowIssue
            [currentScope.findVariable(genericArguments[0].id)],
            typeNode.typeAnnotation.loc,
            false
          );
        }
        const genericParams = genericArguments.map(arg =>
          getTypeFromTypeAnnotation(
            { typeAnnotation: arg },
            typeScope,
            currentScope,
            rewritable,
            self,
            parentNode,
            typeGraph,
            precompute,
            middlecompute,
            postcompute
          )
        );
        return genericParams.some(t => t instanceof TypeVar && t !== self) ||
          TypeVar.isSelf(existedGenericType)
          ? new $BottomType(
              { parent: existedGenericType.parent },
              existedGenericType,
              genericParams,
              typeNode.typeAnnotation.loc
            )
          : // $FlowIssue
            existedGenericType.applyGeneric(
              genericParams,
              typeNode.typeAnnotation.loc
            );
      }
      if (!rewritable) {
        const typeInScope = Type.find(
          genericName,
          { parent: typeScope, loc: target.loc },
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        if (typeInScope.shouldBeUsedAsGeneric) {
          throw new HegelError(
            `Generic type "${String(
              typeInScope.name
            )}" should be used with type paramteres!`,
            target.loc
          );
        }
        return typeInScope instanceof TypeVar && typeInScope.root != undefined
          ? typeInScope.root
          : typeInScope;
      }
      const typeInScope = Type.find(genericName, {
        parent: typeScope,
        loc: target.loc
      });
      if (typeInScope.shouldBeUsedAsGeneric) {
        throw new HegelError(
          `Generic type "${String(
            typeInScope.name
          )}" should be used with type paramteres!`,
          target.loc
        );
      }
      return typeInScope instanceof TypeVar && typeInScope.root != undefined
        ? typeInScope.root
        : typeInScope;
    case NODE.TS_OBJECT_METHOD:
    case NODE.FUNCTION_TYPE_ANNOTATION:
    case NODE.TS_CALL_SIGNATURE_DECLARATION:
    case NODE.TS_CONSTRUCT_SIGNATURE_DECLARATION:
    case NODE.TS_FUNCTION_TYPE_ANNOTATION:
      const localTypeScope = new TypeScope(typeScope);
      const genericParams = typeNode.typeAnnotation.typeParameters
        ? typeNode.typeAnnotation.typeParameters.params.map(param =>
            getTypeFromTypeAnnotation(
              { typeAnnotation: param },
              localTypeScope,
              currentScope,
              rewritable,
              self,
              parentNode,
              typeGraph,
              precompute,
              middlecompute,
              postcompute
            )
          )
        : [];
      const { params: paramsNode, parameters } = typeNode.typeAnnotation;
      const argNodes = paramsNode || parameters;
      const args = argNodes.map(annotation => {
        const result = getTypeFromTypeAnnotation(
          // Ohhh, TS is beautiful ❤️
          annotation.typeAnnotation.type === NODE.TS_TYPE_ANNOTATION
            ? nullable(annotation)
            : annotation,
          localTypeScope,
          currentScope,
          rewritable,
          self,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        return annotation.type === NODE.REST_ELEMENT
          ? RestArgument.term(null, {}, result)
          : result;
      });
      const { returnType: returnTypeNode } = typeNode.typeAnnotation;
      const returnType = getTypeFromTypeAnnotation(
        returnTypeNode
          ? { typeAnnotation: returnTypeNode }
          : // Ohhh, TS is beautiful ❤️
            typeNode.typeAnnotation.typeAnnotation,
        localTypeScope,
        currentScope,
        rewritable,
        self,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      );
      const typeName = FunctionType.getName(args, returnType, genericParams);
      const type = FunctionType.term(typeName, {}, args, returnType);
      if (genericParams.length === 0 || !(type instanceof FunctionType)) {
        return type;
      }
      return GenericType.new(typeName, {}, genericParams, localTypeScope, type);
  }
  return Type.Unknown;
}

export function mergeObjectsTypes(
  obj1?: TypeVar | ObjectType = ObjectType.term("{ }", {}, []),
  obj2?: TypeVar | ObjectType = ObjectType.term("{ }", {}, []),
  typeScope: TypeScope
): ObjectType | TypeVar {
  if (obj1 instanceof TypeVar) {
    return obj1;
  }
  if (obj2 instanceof TypeVar) {
    return obj2;
  }
  return ObjectType.term(null, { isSoft: !obj1.isStrict }, [
    ...obj1.properties.entries(),
    ...obj2.properties.entries()
  ]);
}

export function createObjectWith(
  key: string,
  type: Type,
  typeScope: TypeScope,
  meta?: Meta
): ObjectType {
  const properties = [[key, new VariableInfo(type, undefined, meta)]];
  return ObjectType.term(ObjectType.getName(properties), {}, properties);
}

export function get(
  variable: VariableInfo,
  propertyChaining: ?Array<string>,
  memberExpressionLoc: SourceLocation
): ?Type {
  if (!propertyChaining) {
    return;
  }
  return propertyChaining.reduce((type, propertyName) => {
    if (!(type instanceof ObjectType)) {
      return;
    }
    const property = type.properties.get(propertyName);
    if (property === undefined) {
      return;
    }
    return property.type;
  }, variable.type);
}

export function createSelf(node: Node, parent: TypeScope) {
  return TypeVar.new(
    node.id.name,
    { isSubtypeOf: TypeVar.Self, parent },
    undefined,
    undefined,
    true
  );
}

function getPropertyName(property: Node): string {
  if (property.key !== undefined) {
    return property.key.name;
  }
  switch (property.type) {
    case NODE.TS_CALL_SIGNATURE_DECLARATION:
      return CALLABLE;
    case NODE.TS_CONSTRUCT_SIGNATURE_DECLARATION:
      return CONSTRUCTABLE;
    case NODE.TS_INDEX_PROPERTY:
      return INDEXABLE;
  }
  throw new Error("Never");
}

function getResultObjectType(object: ObjectType) {
  const indexable = object.properties.get(INDEXABLE);
  if (indexable !== undefined) {
    object.properties.delete(INDEXABLE);
    indexable.type.isSubtypeOf = object;
    indexable.type.name = object.name;
    object.parent.body.set(object.name, indexable.type);
    object.name = `${String(object.name)}.prototype`;
    object.parent.body.set(object.name, object);
    return indexable.type;
  }
  return object;
}

function getPropertiesForType(type: ?Type, node: Node) {
  switch (type && type.constructor) {
    case ObjectType:
      // $FlowIssue
      return (type: ObjectType).properties;
    case $BottomType:
      // $FlowIssue
      return getPropertiesForType(type.unpack(), node);
    case FunctionType:
    case CollectionType:
      // $FlowIssue
      return getPropertiesForType(type.isSubtypeOf, node);
    case GenericType:
      throw new HegelError(
        "Generic type should be applied before usage",
        node.loc
      );
    case Type:
      throw new HegelError("Type can not be extended by simple type", node.loc);
    default:
      throw new HegelError(
        `Can not be extended by ${String(type && type.name)}`,
        node.loc
      );
  }
}

export function getWrapperType(
  argument: VariableInfo | Type,
  typeGraph: ModuleScope
) {
  const type = argument instanceof VariableInfo ? argument.type : argument;
  if (type instanceof UnionType) {
    const variants = type.variants.map(t => getWrapperType(t, typeGraph));
    // $FlowIssue
    return UnionType.term(null, {}, variants);
  }
  if (type === Type.String || type.isSubtypeOf === Type.String) {
    return Type.find("String");
  }
  if (type === Type.Number || type.isSubtypeOf === Type.Number) {
    return Type.find("Number");
  }
  if (type === Type.Boolean || type.isSubtypeOf === Type.Boolean) {
    return Type.find("Boolean");
  }
  if (type === Type.Symbol || type.isSubtypeOf === Type.Symbol) {
    return Type.find("Symbol");
  }
  return argument;
}

export let FALSY = [];

export function getFalsy() {
  if (FALSY.length === 0) {
    FALSY = [
      Type.term(false, { isSubtypeOf: Type.Boolean }),
      Type.term(0, { isSubtypeOf: Type.Number }),
      Type.term("0n", { isSubtypeOf: Type.BigInt }),
      Type.term("''", { isSubtypeOf: Type.String }),
      Type.Null,
      Type.Undefined
    ];
  }
  return FALSY;
}

export function pickFalsy(type: Type) {
  if (type instanceof UnionType) {
    const variants = type.variants.map(pickFalsy).filter(Boolean);
    return UnionType.term(null, {}, variants);
  }
  if (type === Type.Boolean) {
    return Type.term(false, { isSubtypeOf: Type.Boolean });
  }
  if (type === Type.String) {
    return Type.term("''", { isSubtypeOf: Type.String });
  }
  if (type === Type.Number) {
    return Type.term(0, { isSubtypeOf: Type.Number });
  }
  if (type === Type.BigInt) {
    return Type.term("0n", { isSubtypeOf: Type.BigInt });
  }
  if (type === Type.Undefined || type === Type.Null) {
    return type;
  }
  if (isFalsy(type)) {
    return type;
  }
}

export function pickTruthy(type: Type) {
  if (type instanceof UnionType) {
    const variants = type.variants.map(pickTruthy).filter(Boolean);
    return UnionType.term(null, {}, variants);
  }
  if (type === Type.Boolean) {
    return Type.term(true, { isSubtypeOf: Type.Boolean });
  }
  if (!isFalsy(type)) {
    return type;
  }
}

export function isFalsy(type: Type) {
  return getFalsy().includes(type);
}
