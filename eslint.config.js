import js from "@eslint/js"
import prettier from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
	globalIgnores(["dist", "worker"]),
	{
		files: ["**/*.ts"],
		extends: [js.configs.recommended, prettierConfig],
		plugins: {
			prettier,
		},
		languageOptions: {
			ecmaVersion: 2020,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		rules: {
			"prettier/prettier": "error",
			"no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
		},
	},
])
