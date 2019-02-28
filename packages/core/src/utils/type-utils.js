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
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { findVariableInfo } from "./common";
import type { TypeAnnotation } from "@babel/parser";

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
  return typeof type.name === "string" &&
    type.isLiteralOf &&
    type.isLiteralOf.name === "string" &&
    !(type instanceof ObjectType) &&
    !(type instanceof FunctionType)
    ? `'${String(type.name)}'`
    : String(type.name);
}

export function getTypeFromTypeAnnotation(
  typeAnnotation: ?TypeAnnotation,
  typeScope: Scope,
  rewritable: ?boolean = true
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
        { isLiteralOf: Type.createTypeWithName("number", typeScope) }
      );
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        typeAnnotation.typeAnnotation.value,
        typeScope,
        { isLiteralOf: Type.createTypeWithName("boolean", typeScope) }
      );
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        typeAnnotation.typeAnnotation.value,
        typeScope,
        { isLiteralOf: Type.createTypeWithName("string", typeScope) }
      );
    case NODE.NULLABLE_TYPE_ANNOTATION:
      const resultType = getTypeFromTypeAnnotation(
        typeAnnotation.typeAnnotation,
        typeScope
      );
      return UnionType.createTypeWithName(
        `${getNameForType(resultType)} | void`,
        typeScope,
        [resultType, Type.createTypeWithName("void", typeScope)]
      );
    case NODE.UNION_TYPE_ANNOTATION:
      const unionVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope, false)
      );
      return UnionType.createTypeWithName(
        UnionType.getName(unionVariants),
        typeScope,
        unionVariants
      );
    case NODE.TUPLE_TYPE_ANNOTATION:
      const tupleVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope)
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
            rewritable
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
        return existedGenericType.type.applyGeneric(
          genericArguments.map(arg =>
            getTypeFromTypeAnnotation(
              { typeAnnotation: arg },
              typeScope,
              rewritable
            )
          ),
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
            getTypeFromTypeAnnotation(param, typeScope, rewritable)
          )
        : [];
      const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
      const args = typeAnnotation.typeAnnotation.params.map(annotation =>
        getTypeFromTypeAnnotation(annotation, typeScope, rewritable)
      );
      const returnType = getTypeFromTypeAnnotation(
        {
          typeAnnotation: typeAnnotation.typeAnnotation.returnType
        },
        typeScope,
        rewritable
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
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope, rewritable)
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
