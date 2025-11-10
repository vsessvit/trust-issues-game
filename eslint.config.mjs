import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
    // Correct key in flat config
    ignores: ["**/test/"],
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "script" },
  },
]);
