export default {
  type: "FunctionTypeAnnotation",
  typeParameters: {
    type: "TypeParameterDeclaration",
    params: [
      {
        type: "TypeParameter",
        name: "T",
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
    type: "GenericTypeAnnotation",
    id: {
      type: "Identifier",
      name: "T"
    }
  }
};
