import createSeaOfNodes from './build/type/sea-of-nodes.mjs';
import babylon from '@babel/parser';

const source = `
  const b: number = 2;
  {
    const b:string = "string";
    {
      const b: number = 5;  
    }
    {
      const b: number = 6;
    }
  }
`;

const AST = babylon.parse(source, {
  sourceType: "module",
  plugins: [
    "flow"
  ],
});

const result = createSeaOfNodes(AST.program);
console.dir(result);

