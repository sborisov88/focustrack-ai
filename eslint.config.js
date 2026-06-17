import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "output",
      "node_modules",
      "src/components/ui",
      "docs/research/001-ai-tooling/practice",
      "supabase/functions",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportSpecifier[imported.name='useEffect'], ImportSpecifier[local.name='useEffect']",
          message:
            "В проекте запрещён прямой useEffect. Используйте derived state, React Query, обработчики событий или явный useMountEffect.",
        },
        {
          selector: "CallExpression[callee.property.name='useEffect']",
          message:
            "В проекте запрещён прямой React.useEffect. Используйте derived state, React Query, обработчики событий или явный useMountEffect.",
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["playwright.config.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
)
