export default {
  type: "FunctionTypeAnnotation",
  typeParameters: {
    type: "TypeParameterDeclaration",
    params: [
      {
        type: "TypeParameter",
        name: "A",
      },
      {
        type: "TypeParameter",
        name: "B",
      }
    ]
  },
  params: [
    {
      type: "FunctionTypeParam",
      optional: false,
      typeAnnotation: {
        type: "BooleanTypeAnnotation",
      }
    },
    {
      type: "FunctionTypeParam",
      optional: false,
      typeAnnotation: {
        type: "GenericTypeAnnotation",
        id: {
          type: "Identifier",
          name: "A"
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
          name: "B"
        }
      }
    }
  ],
  returnType: {
    type: "UnionTypeAnnotation",
    types: [
      {
        type: "GenericTypeAnnotation",
        id: {
          type: "Identifier",
          name: "A"
        }
      },
      {
        type: "GenericTypeAnnotation",
        id: {
          type: "Identifier",
          name: "B"
        }
      }
    ]
  }
};
