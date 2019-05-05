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
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { unique, findVariableInfo } from "./common";
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

export function getNameForType(type: Type): string {
  return String(type.name);
}

export function getTypeFromTypeAnnotation(
  typeAnnotation: ?TypeAnnotation,
  typeScope: Scope,
  currentScope: Scope | ModuleScope,
  rewritable: ?boolean = true,
  self: ?Type = null
): Type {
  if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
    return TypeVar.createTypeWithName(UNDEFINED_TYPE, typeScope);
  }
  switch (typeAnnotation.typeAnnotation.type) {
    case NODE.ANY_TYPE_ANNOTATION:
      throw new HegelError(
        'There is no "any" type in Hegel.',
        typeAnnotation.typeAnnotation.loc
      );
    case NODE.VOID_TYPE_ANNOTATION:
      return Type.createTypeWithName("void", typeScope);
    case NODE.BOOLEAN_TYPE_ANNOTATION:
      return Type.createTypeWithName("boolean", typeScope);
    case NODE.MIXED_TYPE_ANNOTATION:
      return Type.createTypeWithName("mixed", typeScope);
    case NODE.EMPTY_TYPE_ANNOTATION:
      return Type.createTypeWithName("empty", typeScope);
    case NODE.NUMBER_TYPE_ANNOTATION:
      return Type.createTypeWithName("number", typeScope);
    case NODE.STRING_TYPE_ANNOTATION:
      return Type.createTypeWithName("string", typeScope);
    case NODE.NULL_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(null, typeScope);
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        typeAnnotation.typeAnnotation.value,
        typeScope,
        { isSubtypeOf: Type.createTypeWithName("number", typeScope) }
      );
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        typeAnnotation.typeAnnotation.value,
        typeScope,
        { isSubtypeOf: Type.createTypeWithName("boolean", typeScope) }
      );
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        `'${typeAnnotation.typeAnnotation.value}'`,
        typeScope,
        { isSubtypeOf: Type.createTypeWithName("string", typeScope) }
      );
    case NODE.NULLABLE_TYPE_ANNOTATION:
      const resultType = getTypeFromTypeAnnotation(
        typeAnnotation.typeAnnotation,
        typeScope,
        currentScope,
        rewritable,
        self
      );
      return UnionType.createTypeWithName(
        `${getNameForType(resultType)} | void`,
        typeScope,
        [resultType, Type.createTypeWithName("void", typeScope)]
      );
    case NODE.UNION_TYPE_ANNOTATION:
      const unionVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
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
      const tupleVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
          getTypeFromTypeAnnotation(
            { typeAnnotation },
            typeScope,
            currentScope,
            false,
            self
          )
      );
      return TupleType.createTypeWithName(
        TupleType.getName(tupleVariants),
        typeScope,
        tupleVariants
      );
    case NODE.TYPE_PARAMETER:
      return addTypeVar(
        typeAnnotation.typeAnnotation.name,
        typeScope,
        typeAnnotation.typeAnnotation.bound &&
          getTypeFromTypeAnnotation(
            typeAnnotation.typeAnnotation.bound,
            typeScope,
            currentScope,
            false,
            self
          ),
        true
      );
    case NODE.GENERIC_TYPE_ANNOTATION:
      const genericArguments =
        typeAnnotation.typeAnnotation.typeParameters &&
        typeAnnotation.typeAnnotation.typeParameters.params;
      const genericName = typeAnnotation.typeAnnotation.id.name;
      if (genericArguments) {
        const existedGenericType = findVariableInfo(
          { name: genericName },
          typeScope
        );
        if (
          !existedGenericType ||
          !(existedGenericType.type instanceof GenericType)
        ) {
          throw new HegelError(
            `Apply undeclareted generic type '${genericName}'`,
            typeAnnotation.typeAnnotation.loc
          );
        }
        if (existedGenericType.type.name === "$TypeOf") {
          if (
            genericArguments.length !== 1 ||
            (genericArguments[0].id &&
              genericArguments[0].id.type !== NODE.IDENTIFIER)
          ) {
            throw new HegelError(
              `"$TypeOf" work only with identifier`,
              typeAnnotation.typeAnnotation.loc
            );
          }
          return existedGenericType.type.applyGeneric(
            // $FlowIssue
            [findVariableInfo(genericArguments[0].id, currentScope)],
            typeAnnotation.typeAnnotation.loc,
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
              existedGenericType.type,
              genericParams,
              typeAnnotation.typeAnnotation.loc
            )
          : // $FlowIssue
            existedGenericType.type.applyGeneric(
              genericParams,
              typeAnnotation.typeAnnotation.loc
            );
      }
      if (!rewritable) {
        return findVariableInfo({ name: genericName }, typeScope).type;
      }
      return Type.createTypeWithName(genericName, typeScope);
    case NODE.FUNCTION_TYPE_ANNOTATION:
      const genericParams = typeAnnotation.typeAnnotation.typeParameters
        ? typeAnnotation.typeAnnotation.typeParameters.params.map(param =>
            getTypeFromTypeAnnotation(
              param,
              typeScope,
              currentScope,
              rewritable,
              self
            )
          )
        : [];
      const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
      const args = typeAnnotation.typeAnnotation.params.map(annotation =>
        getTypeFromTypeAnnotation(
          annotation,
          typeScope,
          currentScope,
          rewritable,
          self
        )
      );
      const returnType = getTypeFromTypeAnnotation(
        {
          typeAnnotation: typeAnnotation.typeAnnotation.returnType
        },
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
    case NODE.OBJECT_TYPE_ANNOTATION:
      const { typeAnnotation: annotation } = typeAnnotation;
      const params = typeAnnotation.typeAnnotation.properties.map(
        ({ value: typeAnnotation, key }) => [
          key.name,
          getTypeFromTypeAnnotation(
            { typeAnnotation },
            typeScope,
            currentScope,
            rewritable,
            self
          )
        ]
      );
      const objectName = ObjectType.getName(params);
      return ObjectType.createTypeWithName(
        objectName,
        typeScope,
        params.map(([name, type], index) => [
          name,
          new VariableInfo(
            type,
            undefined,
            new Meta(annotation.properties[index].loc)
          )
        ])
      );
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

export function createSelf(node: Node, parent: Scope | ModuleScope) {
  return new VariableInfo(
    new TypeVar(node.id.name),
    parent,
    new Meta(node.loc)
  );
}
