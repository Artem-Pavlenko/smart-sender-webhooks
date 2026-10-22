import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "public/mockServiceWorker.js"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Project conventions: components are arrow functions typed with FC, and props always
    // live in a named interface.
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration[id.name=/^[A-Z]/]",
          message:
            "Declare components as arrow functions: const Name = (props) => { … };",
        },
        {
          selector:
            "VariableDeclarator[id.name=/^[A-Z][a-z]/][init.type='ArrowFunctionExpression']:not([id.typeAnnotation])",
          message: "Type components with FC: const Name: FC<NameProps> = …",
        },
        {
          selector:
            "TSTypeReference[typeName.name='FC'] > TSTypeParameterInstantiation > TSTypeLiteral",
          message:
            "Declare props in a named interface: interface NameProps { … }",
        },
      ],
    },
  },
]);
