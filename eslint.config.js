import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
	globalIgnores(["dist", "static"]),
	{
		files: ["**/*.ts"],
		extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
		plugins: {
			prettier,
		},
		rules: {
			"prettier/prettier": "error",
			"@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
		},
	},
])
