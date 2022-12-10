import sourceMaps from "rollup-plugin-sourcemaps";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import builtins from "rollup-plugin-node-builtins";
import typescript from "rollup-plugin-typescript2";
import camelCase from "lodash.camelcase";

import pack from "./package.json";

const name = pack.name;

export default {
  input: `src/index.ts`,
  output: [
    {
      file: pack.main,
      name: camelCase(name),
      format: "umd",
      sourcemap: true,
    },
    { file: pack.module, format: "es", sourcemap: true },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: "src/**",
  },
  plugins: [
    builtins(),
    // Allow json resolution
    json(),

    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Resolve source maps to the original source
    sourceMaps(),
  ],
};
