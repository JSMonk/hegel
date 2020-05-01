const globalTypeAliases = [
  [
    "$Class",
    {
      name: "$Class",
    },
  ],
  [
    "$Exclude",
    {
      name: "$Exclude",
    },
  ],
  [
    "$Immutable",
    {
      name: "$Immutable",
    },
  ],
  [
    "$InstanceOf",
    {
      name: "$InstanceOf",
    },
  ],
  [
    "$Intersection",
    {
      name: "$Intersection",
    },
  ],
  [
    "$Keys",
    {
      name: "$Keys",
    },
  ],
  [
    "$Omit",
    {
      name: "$Omit",
    },
  ],
  [
    "$Partial",
    {
      name: "$Partial",
    },
  ],
  [
    "$Pick",
    {
      name: "$Pick",
    },
  ],
  [
    "$PropertyType",
    {
      name: "$PropertyType",
    },
  ],
  [
    "$ReturnType",
    {
      name: "$ReturnType",
    },
  ],
  [
    "$Soft",
    {
      name: "$Soft",
    },
  ],
  [
    "$Strict",
    {
      name: "$Strict",
    },
  ],
  [
    "$Throws",
    {
      name: "$Throws",
    },
  ],
  [
    "$TypeOf",
    {
      name: "$TypeOf",
    },
  ],
  [
    "$Values",
    {
      name: "$Values",
    },
  ],
  ["unknown", { name: "unknown" }],
  ["never", { name: "never" }],
  ["undefined", { name: "undefined" }],
  /** Hegel returns null as not string, but as value. */
  ["null", { name: "null" }],
  ["number", { name: "number" }],
  ["bigint", { name: "bigint" }],
  ["string", { name: "string" }],
  ["boolean", { name: "boolean" }],
  ["symbol", { name: "symbol" }],
];

function getTypeAliasNames(scope) {
  if (scope.typeScope === undefined) {
    return globalTypeAliases;
  }

  return scope.parent !== null
    ? Array.from(scope.typeScope.body.entries())
        .map(([varName, varInfo]) => [
          varName,
          {
            name: varName,
          },
        ])
        .concat(globalTypeAliases)
    : /** If here return already known types in VSCode types aliases will be doubled. */
      [];
}

exports.getTypeAliasNames = getTypeAliasNames;
