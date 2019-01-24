export default {
  type: "FunctionTypeAnnotation",
  typeParameters: {
    type: "TypeParameterDeclaration",
    params: [
      {
        type: "TypeParameter",
        name: "T",
        bound: {
          type: "TypeAnnotation",
          typeAnnotation: {
            type: "UnionTypeAnnotation",
            types: [
              {
                type: "NumberTypeAnnotation"
              },
              {
                type: "StringTypeAnnotation"
              }
            ]
          }
        }
      }
    ]
  },
  params: [
    {
      type: "FunctionTypeParam",
      optional: false,
      typeAnnotation: {
        type: "GenericTypeAnnotation",
        id: {
          type: "Identifier",
          name: "T"
        }
      }
    },
    {
      type: "FunctionTypeParam",
      optional: false,
      typeAnnotation: {
        type: "GenericTypeAnnotation",
        id: {
          type: "Identifier",
          name: "T"
        }
      }
    }
  ],
  returnType: {
    type: "BooleanTypeAnnotation"
  }
};
