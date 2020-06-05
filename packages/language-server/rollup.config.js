import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import builtinModules from 'builtin-modules';
import replace from '@rollup/plugin-replace';

const base = {
  output: {
    format: 'cjs'
  },
  external: [
    ...builtinModules,
    'vscode'
  ],
  plugins: [
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
    babel({ babelHelpers: 'bundled' })
  ]
};

export default [
  {
    ...base,
    input: 'src/client/client.js',
    output: {
      ...base.output,
      file: 'build/client.js',
    }
  },
  {
    ...base,
    input: 'src/server/server.js',
    output: {
      ...base.output,
      file: 'build/server.js',
    },
    plugins: [
      replace({ 
        'require.resolve': 'require_resolve',
      }),
      ...base.plugins,
      {
        renderChunk (code) {
          return 'var require_resolve = require.resolve.bind(require);\n' + code;
        }
      }
    ]
  }
];
