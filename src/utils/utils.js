// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import type { TypeAnnotation, TypeParameter } from "@babel/parser";
import {
  Scope,
  VariableInfo,
  ModuleScope,
  FunctionType,
  ObjectType,
  GenericType,
  Type,
  TYPE_SCOPE,
  Meta,
  UNDEFINED_TYPE
} from "../type/types";

export const findVariableInfo = (
  name: string,
  parentContext: ModuleScope | Scope,
  moduleContext: ModuleScope
): [?VariableInfo, ?VariableInfo] => {
  let parent = parentContext;
  const typeScope = moduleContext.body.get(TYPE_SCOPE);
  if (!(typeScope instanceof Scope)) {
    throw new Error("Impossible thing!");
  }
  do {
    const variableInfo = parent.body.get(name);
    if (variableInfo && variableInfo instanceof VariableInfo) {
      const typeAlias =
        typeScope &&
        typeScope.body.get(/*::String(*/ variableInfo.type.name /*::)*/);
      if (!(typeAlias instanceof VariableInfo)) {
        throw new Error("Impossible thing!");
      }
      return [variableInfo, typeAlias];
    }
    parent = parent.parent;
  } while (parent);
  return [null, null];
};

export const getInvocationType = (variable: VariableInfo): Type => {
  if (variable.type instanceof FunctionType) {
    return variable.type.returnType;
  }
  return variable.type;
};

export const getNameForType = (type: Type): string =>
  typeof type.name === "string" &&
  type.isLiteral &&
  !(type instanceof ObjectType) &&
  !(type instanceof FunctionType)
    ? `'${String(type.name)}'`
    : String(type.name);

export const getFunctionTypeLiteral = (
  params: Array<Type>,
  returnType: Type,
  genericParams: Array<TypeParameter> = []
) =>
  `${
    genericParams.length
      ? `<${genericParams.reduce(
          (res, t) => `{res}${res ? ", " : ""}${t.name}`,
          ""
        )}>`
      : ""
  }(${params.map(getNameForType).join(", ")}) => ${String(returnType.name)}`;

export const getObjectTypeLiteral = (params: Array<[string, Type]>) =>
  `{ ${params
    .sort(([name1], [name2]) => name1.charCodeAt(0) - name2.charCodeAt(0))
    .map(([name, type]) => `${name}: ${getNameForType(type)}`)
    .join(", ")} }`;

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
      return Type.createTypeWithName("any", typeScope);
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
      return Type.createTypeWithName(null, typeScope, { isLiteral: true });
    case NODE.TYPE_PARAMETER:
      if (typeAnnotation.typeAnnotation.bound) {
        return getTypeFromTypeAnnotation(
          typeAnnotation.typeAnnotation.bound,
          typeScope,
          rewritable
        );
      } else {
        return Type.createTypeWithName(
          typeAnnotation.typeAnnotation.name,
          typeScope
        );
      }
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
    case NODE.NUBMER_LITERAL_TYPE_ANNOTATION:
    case NODE.BOOLEAN_LITERAL_TYPE_ANNOTATION:
    case NODE.STRING_LITERAL_TYPE_ANNOTATION:
      return Type.createTypeWithName(
        typeAnnotation.typeAnnotation.value,
        typeScope,
        {
          isLiteral: true
        }
      );
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
