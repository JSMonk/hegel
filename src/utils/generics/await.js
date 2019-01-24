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
        typeParameters: {
          type: "TypeParameterInstantiation",
          params: [
            {
              type: "GenericTypeAnnotation",
              id: {
                type: "Identifier",
                name: "T"
              }
            }
          ]
        },
        "id": {
          type: "Identifier",
          name: "Promise"
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
}
