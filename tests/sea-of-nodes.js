const babylon = require("@babel/parser");
const createSeaOfNodes = require("../build/type/sea-of-nodes").default;

const babelrc = {
  sourceType: "module",
  plugins: ["flow"]
};

const prepeareAST = source => babylon.parse(source, babelrc).program;

const getEntries = map => [...map.entries()];

describe("Simple global variable nodes", () => {
  test("Creating global module variable with type", async () => {
    const sourceAST = prepeareAST(`
      const a: number = 2;
    `);
    const actual = createSeaOfNodes(sourceAST);
    const actualEntries = getEntries(actual);
    const expected = [
      [
        "a",
        expect.objectContaining({
          type: "number",
          parent: actual
        })
      ]
    ];
    expect(actualEntries).toEqual(expected);
  });
});
