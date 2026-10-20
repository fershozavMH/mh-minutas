import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  // Las rutas y páginas leen datos solo por la capa de acceso (src/lib/data); Administración es la excepción.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/api/admin/**", "src/app/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/db", message: "Usa la capa de acceso en src/lib/data." },
            { name: "@/generated/prisma/client", message: "Usa la capa de acceso en src/lib/data." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
