// eslint-disable-next-line no-unused-vars
import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "calc-s2-rust": "<rootDir>/node_modules/calc-s2-rust/calc_s2_rust.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
    "\\.js$": ["babel-jest", { configFile: "./babel-jest.config.js" }],
  },
  transformIgnorePatterns: ["node_modules/(?!calc-s2-rust)/"],
};

export default jestConfig;
