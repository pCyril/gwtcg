import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // RGAA 4.1.2 guardrail: the full jsx-a11y "strict" rule set (eslint-config-next only
  // enables six rules as warnings). The plugin itself is registered by nextVitals.
  {
    files: ["**/*.{jsx,tsx}"],
    settings: { "jsx-a11y": { components: { Link: "a" } } },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "jsx-a11y/anchor-is-valid": ["error", { components: ["Link"] }],
      // role="list" on styled lists is intentional: Safari/VoiceOver drop list semantics with list-style: none.
      "jsx-a11y/no-redundant-roles": ["error", { ul: ["list"], ol: ["list"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
