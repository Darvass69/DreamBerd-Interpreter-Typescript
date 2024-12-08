import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from 'eslint-plugin-unicorn';


export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs['flat/recommended'],
		{
			rules: {
				'unicorn/better-regex': 'warn',
        "@typescript-eslint/no-empty-object-type": 'warn',
        "unicorn/filename-case": 'warn',
        "@typescript-eslint/no-unused-vars": 'warn',
        "prefer-const": 'warn',
        "unicorn/no-process-exit": 'warn',
        "unicorn/prefer-top-level-await": 'off',
        "unicorn/prefer-code-point": 'off',
        "unicorn/prefer-ternary": 'off',
        "unicorn/no-null": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "unicorn/escape-case": "off",
        "unicorn/no-hex-escape": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/no-array-for-each": "off",
        "@typescript-eslint/ban-ts-comment": "warn",
        "unicorn/no-array-push-push": "warn",
        "unicorn/no-negated-condition": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-unsafe-function-type": "warn",
        "semi": [1, "always"],
			},
		},
];
