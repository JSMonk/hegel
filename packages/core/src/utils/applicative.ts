// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { TupleType } from "../type-graph/types/tuple-type";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { $BottomType } from "../type-graph/types/bottom-type";
import { GenericType } from "../type-graph/types/generic-type";
import { VariableInfo } from "../type-graph/variable-info";
import { CollectionType } from "../type-graph/types/collection-type";
import { FunctionType, RestArgument } from "../type-graph/types/function-type";
import { UNDEFINED_TYPE, CALLABLE, INDEXABLE } from "../type-graph/constants";
import { unique, findVariableInfo, createSelf } from "./common";
import type { ModuleScope } from "../type-graph/module-scope";
import type { Node, TypeAnnotation, SourceLocation } from "@babel/parser";

export function addTypeVar(
  name: string,
  localTypeScope: Scope,
  constraint: ?Type,
  isUserDefined?: boolean = false
): TypeVar {
  const typeVar = new TypeVar(name, constraint, isUserDefined);
  const varInfo = new VariableInfo(typeVar, localTypeScope, new Meta());
  localTypeScope.body.set(name, varInfo);
  return typeVar;
}

export function getNameForType(arg: Type | RestArgument): string {
  return String(arg.name);
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
  typeScope: Scope,
  currentScope: Scope | ModuleScope,
  rewritable: ?boolean = true,
  self: ?Type = null
): Type {
  if (!typeNode || !typeNode.typeAnnotation) {
    return TypeVar.createTypeWithName(UNDEFINED_TYPE, typeScope);
  }
  switch (typeNode.typeAnnotation.type) {
    case NODE.THIS_TYPE_ANNOTATION:
    case NODE.TS_THIS_TYPE_ANNOTATION:
      if (self === null || self === undefined) {
        throw new HegelError(
          "Can not use `this` type without context",
          typeNode.loc
        );
      }
      return self;
    case NODE.TS_LITERAL_TYPE:
      return getTypeFromTypeAnnotation(
        { typeAnnotation: typeNode.typeAnnotation.literal },
        typeScope,
        currentScope,
        rewritable,
        self
      );
    case NODE.TS_ANY_TYPE_ANNOTATION:
      return Type.createTypeWithName("mixed", typeScope);
    case NODE.ANY_TYPE_ANNOTATION:
      throw new HegelError(
        'There is no "any" type in Hegel.',
        typeNode.typeAnnotation.loc
      );
    case NODE.TS_SYMBOL_TYPE_ANNOTATION:
      return Type.createTypeWithName("Symbol", typeScope);
    case NODE.TS_UNDEFINED_TYPE_ANNOTATION:
      return Type.createTypeWithName("undefined", typeScope);
    case NODE.VOID_TYPE_ANNOTATION:
    case NODE.TS_VOID_TYPE_ANNOTATION:
      return Type.createTypeWithName("void", typeScope);
    case NODE.BOOLEAN_TYPE_ANNOTATION:
    case NODE.TS_BOOLEAN_TYPE_ANNOTATION:
      return Type.createTypeWithName("boolean", typeScope);
    case NODE.MIXED_TYPE_ANNOTATION:
    case NODE.TS_UNKNOWN_TYPE_ANNOTATION:
    case NODE.TS_ANY_TYPE_ANNOTATION:
      return Type.createTypeWithName("mixed", typeScope);
    case NODE.EMPTY_TYPE_ANNOTATION:
    case NODE.TS_NEVER_TYPE_ANNOTATION:
      return Type.createTypeWithName("never", typeScope);
    case NODE.NUMBER_TYPE_ANNOTATION:
    case NODE.TS_NUMBER_TYPE_ANNOTATION:
      return Type.createTypeWithName("number", typeScope);
    case NODE.STRING_TYPE_ANNOTATION:
    case NODE.TS_STRING_TYPE_ANNOTATION:
      return Type.createTypeWithName("string", typeScope);
    case NODE.NULL_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(null, typeScope);
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
    case NODE.NUMERIC_LITERAL:
      return Type.createTypeWithName(typeNode.typeAnnotation.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("number", typeScope)
      });
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
    case NODE.BOOLEAN_LITERAL:
      return Type.createTypeWithName(typeNode.typeAnnotation.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("boolean", typeScope)
      });
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
    case NODE.STRING_LITERAL:
      return Type.createTypeWithName(
        `'${typeNode.typeAnnotation.value}'`,
        typeScope,
        { isSubtypeOf: Type.createTypeWithName("string", typeScope) }
      );
    case NODE.TS_SYMBOL_TYPE_ANNOTATION:
      return Type.createTypeWithName("Symbol", typeScope);
    case NODE.NULLABLE_TYPE_ANNOTATION:
      const resultType = getTypeFromTypeAnnotation(
        typeNode.typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self
      );
      return UnionType.createTypeWithName(
        `${getNameForType(resultType)} | undefined`,
        typeScope,
        [resultType, Type.createTypeWithName("undefined", typeScope)]
      );
    case NODE.TS_OBJECT_PROPERTY:
      return getTypeFromTypeAnnotation(
        // Ohhh, TS is beautiful ❤️
        nullable(typeNode.typeAnnotation),
        typeScope,
        currentScope,
        false,
        self
      );
    case NODE.UNION_TYPE_ANNOTATION:
    case NODE.TS_UNION_TYPE_ANNOTATION:
      const unionVariants = typeNode.typeAnnotation.types.map(typeAnnotation =>
        getTypeFromTypeAnnotation(
          { typeAnnotation },
          typeScope,
          currentScope,
          false,
          self
        )
      );
      return UnionType.createTypeWithName(
        UnionType.getName(unionVariants),
        typeScope,
        unionVariants
      );
    case NODE.TUPLE_TYPE_ANNOTATION:
    case NODE.TS_TUPLE_TYPE_ANNOTATION:
      const tupleVariants = typeNode.typeAnnotation.types.map(typeAnnotation =>
        getTypeFromTypeAnnotation(
          { typeAnnotation },
          typeScope,
          currentScope,
          false,
          self
        )
      );
      const parentType = findVariableInfo({ name: "Array" }, typeScope).type;
      if (!(parentType instanceof GenericType)) {
        throw new Error("Never!");
      }
      const isSubtypeOf = parentType.applyGeneric([
        UnionType.createTypeWithName(
          UnionType.getName(tupleVariants),
          typeScope,
          tupleVariants
        )
      ]);
      return TupleType.createTypeWithName(
        TupleType.getName(tupleVariants),
        typeScope,
        tupleVariants,
        { isSubtypeOf }
      );
    case NODE.TYPE_PARAMETER:
    case NODE.TS_TYPE_PARAMETER:
      return addTypeVar(
        typeNode.typeAnnotation.name,
        typeScope,
        typeNode.typeAnnotation.bound &&
          getTypeFromTypeAnnotation(
            typeNode.typeAnnotation.bound,
            typeScope,
            currentScope,
            false,
            self
          ),
        true
      );
    case NODE.TS_INDEX_PROPERTY:
      return new CollectionType(
        "",
        getTypeFromTypeAnnotation(
          typeNode.typeAnnotation.parameters[0].typeAnnotation,
          typeScope,
          currentScope,
          rewritable,
          self
        ),
        getTypeFromTypeAnnotation(
          // Ohhh, TS is beautiful ❤️
          typeNode.typeAnnotation.typeAnnotation,
          typeScope,
          currentScope,
          rewritable,
          self
        )
      );
    case NODE.OBJECT_TYPE_ANNOTATION:
    case NODE.TS_OBJECT_TYPE_ANNOTATION:
    case NODE.TS_INTERFACE_DECLARATION:
      const { typeAnnotation: annotation } = typeNode;
      const objectBody = annotation.body || annotation;
      const properties =
        objectBody.properties || objectBody.body || objectBody.members;
      const superTypes = (annotation.extends || []).map(node =>
        getTypeFromTypeAnnotation(
          { typeAnnotation: node },
          typeScope,
          currentScope,
          rewritable,
          self
        )
      );
      const params = properties.map(property => [
        getPropertyName(property),
        getTypeFromTypeAnnotation(
          { typeAnnotation: property.value || property },
          typeScope,
          currentScope,
          rewritable,
          self
        )
      ]);
      const objectName = annotation.id
        ? annotation.id.name
        : ObjectType.getName(params);
      const resultObj = ObjectType.createTypeWithName(
        objectName,
        typeScope,
        params
          .map(([name, type], index) => [
            name,
            new VariableInfo(type, undefined, new Meta(properties[index].loc))
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
        self
      );
    case NODE.GENERIC_TYPE_ANNOTATION:
    case NODE.TS_TYPE_REFERENCE_ANNOTATION:
    case NODE.TS_EXPRESSION_WITH_TYPE_ARGUMENTS:
      const target = typeNode.typeAnnotation || typeNode;
      const genericArguments =
        target.typeParameters && target.typeParameters.params;
      const genericName = (target.id || target.typeName || target.expression)
        .name;
      if (genericArguments != undefined) {
        const typeInScope = findVariableInfo({ name: genericName }, typeScope)
          .type;
        const existedGenericType =
          typeInScope instanceof TypeVar && typeInScope.root != undefined
            ? typeInScope.root
            : typeInScope;
        if (
          !existedGenericType ||
          (!(existedGenericType instanceof GenericType) &&
            !(
              existedGenericType instanceof TypeVar &&
              !existedGenericType.isUserDefined
            ))
        ) {
          throw new HegelError(
            `Apply undeclareted generic type '${genericName}'`,
            typeNode.typeAnnotation.loc
          );
        }
        if (existedGenericType.name === "$TypeOf") {
          if (
            genericArguments.length !== 1 ||
            (genericArguments[0].id &&
              genericArguments[0].id.type !== NODE.IDENTIFIER)
          ) {
            throw new HegelError(
              `"$TypeOf" work only with identifier`,
              typeNode.typeAnnotation.loc
            );
          }
          return existedGenericType.applyGeneric(
            // $FlowIssue
            [findVariableInfo(genericArguments[0].id, currentScope)],
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
            self
          )
        );
        return genericParams.some(t => t instanceof TypeVar && t !== self)
          ? new $BottomType(
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
        const typeInScope = findVariableInfo({ name: genericName }, typeScope)
          .type;
        return typeInScope instanceof TypeVar && typeInScope.root != undefined
          ? typeInScope.root
          : typeInScope;
      }
      const typeInScope = Type.createTypeWithName(genericName, typeScope);
      return typeInScope instanceof TypeVar && typeInScope.root != undefined
        ? typeInScope.root
        : typeInScope;
    case NODE.TS_OBJECT_METHOD:
    case NODE.FUNCTION_TYPE_ANNOTATION:
    case NODE.TS_CALL_SIGNATURE_DECLARATION:
    case NODE.TS_FUNCTION_TYPE_ANNOTATION:
      const genericParams = typeNode.typeAnnotation.typeParameters
        ? typeNode.typeAnnotation.typeParameters.params.map(param =>
            getTypeFromTypeAnnotation(
              param.type === NODE.TS_TYPE_PARAMETER
                ? { typeAnnotation: param }
                : param,
              typeScope,
              currentScope,
              rewritable,
              self
            )
          )
        : [];
      const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
      const { params: paramsNode, parameters } = typeNode.typeAnnotation;
      const argNodes = paramsNode || parameters;
      const args = argNodes.map(annotation =>
        getTypeFromTypeAnnotation(
          // Ohhh, TS is beautiful ❤️
          annotation.typeAnnotation.type === NODE.TS_TYPE_ANNOTATION
            ? nullable(annotation)
            : annotation,
          typeScope,
          currentScope,
          rewritable,
          self
        )
      );
      const { returnType: returnTypeNode } = typeNode.typeAnnotation;
      const returnType = getTypeFromTypeAnnotation(
        returnTypeNode
          ? { typeAnnotation: returnTypeNode }
          : // Ohhh, TS is beautiful ❤️
            typeNode.typeAnnotation.typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self
      );
      const typeName = FunctionType.getName(args, returnType, genericParams);
      const type = FunctionType.createTypeWithName(
        typeName,
        typeScope,
        args,
        returnType
      );
      return genericParams.length
        ? GenericType.createTypeWithName(
            typeName,
            typeScope,
            genericParams,
            localTypeScope,
            type
          )
        : type;
  }
  return TypeVar.createTypeWithName(UNDEFINED_TYPE, typeScope);
}

export function mergeObjectsTypes(
  obj1?: ObjectType = new ObjectType("{  }", []),
  obj2?: ObjectType = new ObjectType("{  }", []),
  typeScope: Scope
): ObjectType {
  const resultProperties = unique(
    [...obj1.properties.entries(), ...obj2.properties.entries()],
    ([key]) => key
  );
  return ObjectType.createTypeWithName(
    ObjectType.getName(resultProperties),
    typeScope,
    resultProperties
  );
}

export function createObjectWith(
  key: string,
  type: Type,
  typeScope: Scope,
  meta?: Meta
): ObjectType {
  const properties = [[key, new VariableInfo(type, null, meta)]];
  return ObjectType.createTypeWithName(
    ObjectType.getName(properties),
    typeScope,
    properties
  );
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

export function copyTypeInScopeIfNeeded(type: Type, typeScope: Scope) {
  if (!(type instanceof TypeVar) || !type.isUserDefined) {
    return type;
  }
  const name = String(type.name);
  try {
    const existedInScopeType = findVariableInfo({ name }, typeScope);
    return existedInScopeType.type;
  } catch {
    const copiedType = Object.create(Object.getPrototypeOf(type));
    // $FlowIssue
    Object.assign(copiedType, type);
    if (copiedType instanceof TypeVar) {
      copiedType.isUserDefined = false;
    }
    typeScope.body.set(name, new VariableInfo(copiedType));
    return copiedType;
  }
}

function getPropertyName(property: Node): string {
  if (property.key !== undefined) {
    return property.key.name;
  }
  switch (property.type) {
    case NODE.TS_CALL_SIGNATURE_DECLARATION:
    case NODE.TS_CONSTRUCT_SIGNATURE_DECLARATION:
      return CALLABLE;
    case NODE.TS_INDEX_PROPERTY:
      return INDEXABLE;
  }
  throw new Error("Never");
}

function getResultObjectType(object: ObjectType) {
  const callable = object.properties.get(CALLABLE);
  if (callable !== undefined) {
    object.properties.delete(CALLABLE);
    callable.type.isSubtypeOf = object;
    callable.type.name = object.name;
    return callable.type;
  }
  const indexable = object.properties.get(INDEXABLE);
  if (indexable !== undefined) {
    object.properties.delete(INDEXABLE);
    indexable.type.isSubtypeOf = object;
    indexable.type.name = object.name;
    return indexable.type;
  }
  return object;
}

function getPropertiesForType(type: ?Type, node: Node) {
  switch (type && type.constructor) {
    case ObjectType:
      // $FlowIssue
      return (type: ObjectType).properties;
    case FunctionType:
    case CollectionType:
      return getPropertiesForType(type && type.isSubtypeOf, node);
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
