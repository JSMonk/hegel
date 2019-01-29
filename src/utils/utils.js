// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import type {
  Node,
  SourceLocation,
  TypeAnnotation,
  TypeParameter
} from "@babel/parser";
import {
  Scope,
  TypeVar,
  VariableInfo,
  ModuleScope,
  FunctionType,
  ObjectType,
  UnionType,
  GenericType,
  TupleType,
  Type,
  TYPE_SCOPE,
  Meta,
  UNDEFINED_TYPE
} from "../type/types";

export const getNameForType = (type: Type): string =>
  typeof type.name === "string" &&
  type.isLiteralOf &&
  !(type instanceof ObjectType) &&
  !(type instanceof FunctionType)
    ? `'${String(type.name)}'`
    : String(type.name);

export const findVariableInfo = (
  { name, loc }: { name: string, loc?: SourceLocation },
  parentContext: ModuleScope | Scope
): VariableInfo => {
  let parent = parentContext;
  do {
    const variableInfo = parent.body.get(name);
    if (variableInfo && variableInfo instanceof VariableInfo) {
      return variableInfo;
    }
    parent = parent.parent;
  } while (parent);
  throw new HegelError(`Variable "${name}" is not defined!`, loc);
};

export const getInvocationType = (type: Type): Type => {
  if (type instanceof FunctionType) {
    return type.returnType;
  }
  return type;
};

export const getFunctionTypeLiteral = (
  params: Array<Type>,
  returnType: Type,
  genericParams: Array<Type> = []
) =>
  `${
    genericParams.length
      ? `<${genericParams.reduce(
          (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
          ""
        )}>`
      : ""
  }(${params.map(getNameForType).join(", ")}) => ${getNameForType(returnType)}`;

export const getObjectTypeLiteral = (
  /* $FlowIssue - Union type is principal type */
  params: Array<[string, Type]> | Array<[string, VariableInfo]>
) =>
  `{ ${params
    .sort(([name1], [name2]) => name1.localeCompare(name2))
    .map(
      ([name, type]) =>
        `${name}: ${getNameForType(
          type instanceof VariableInfo ? type.type : type
        )}`
    )
    .join(", ")} }`;

export const getUnionTypeLiteral = (params: Array<Type>) =>
  `${params
    .sort((t1, t2) => getNameForType(t1).localeCompare(getNameForType(t2)))
    .reduce((res, t) => `${res}${res ? " | " : ""}${getNameForType(t)}`, "")}`;

export const getTupleTypeLiteral = (params: Array<Type>) =>
  `[${params
    .sort((t1, t2) => getNameForType(t1).localeCompare(getNameForType(t2)))
    .reduce((res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`, "")}]`;

export const getTypeFromTypeAnnotation = (
  typeAnnotation: ?TypeAnnotation,
  typeScope: Scope,
  rewritable: ?boolean = true
): Type => {
  if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
    return Type.createTypeWithName(UNDEFINED_TYPE, typeScope);
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
        `${getNameForType(resultType)} | null`,
        typeScope,
        [resultType, Type.createTypeWithName(null, typeScope)]
      );
    case NODE.UNION_TYPE_ANNOTATION:
      const unionVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope, false)
      );
      return UnionType.createTypeWithName(
        getUnionTypeLiteral(unionVariants),
        typeScope,
        unionVariants
      );
    case NODE.TUPLE_TYPE_ANNOTATION:
      const tupleVariants = typeAnnotation.typeAnnotation.types.map(
        typeAnnotation =>
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope)
      );
      return TupleType.createTypeWithName(
        getTupleTypeLiteral(tupleVariants),
        typeScope,
        tupleVariants
      );
    case NODE.TYPE_PARAMETER:
      return TypeVar.createTypeWithName(
        typeAnnotation.typeAnnotation.name,
        typeScope,
        typeAnnotation.typeAnnotation.bound &&
          getTypeFromTypeAnnotation(
            typeAnnotation.typeAnnotation.bound,
            typeScope,
            rewritable
          ),
        rewritable
      );
    case NODE.GENERIC_TYPE_ANNOTATION:
      const genericArguments =
        typeAnnotation.typeAnnotation.typeParameters &&
        typeAnnotation.typeAnnotation.typeParameters.params;
      const genericName = typeAnnotation.typeAnnotation.id.name;
      if (genericArguments) {
        const existedGenericType = typeScope.body.get(genericName);
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
      // TODO: Remve dirty hack
      if (!rewritable) {
        return /*::(*/ typeScope.body.get(genericName) /*:: :any)*/.type;
      }
      return Type.createTypeWithName(genericName, typeScope);
    case NODE.FUNCTION_TYPE_ANNOTATION:
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
      return FunctionType.createTypeWithName(
        getFunctionTypeLiteral(args, returnType),
        typeScope,
        args,
        returnType
      );
    case NODE.OBJECT_TYPE_ANNOTATION:
      const { typeAnnotation: annotation } = typeAnnotation;
      const params = typeAnnotation.typeAnnotation.properties.map(
        ({ value: typeAnnotation, key }) => [
          key.name,
          getTypeFromTypeAnnotation({ typeAnnotation }, typeScope, rewritable)
        ]
      );
      const objectName = getObjectTypeLiteral(params);
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
  return Type.createTypeWithName(UNDEFINED_TYPE, typeScope);
};
