/**
 * A minimal ESM resolve hook so Node can run the project's TypeScript directly.
 *
 * The domain modules use extensionless relative imports (e.g. `import "./coin"`),
 * which the tsconfig's "bundler" resolution permits but Node's ESM resolver does
 * not. Rather than rewrite the spec-conformant source to add `.ts` extensions, we
 * resolve extensionless relative specifiers to their `.ts` file here. Registered
 * via `node --import ./src/ts-resolve.mts`, alongside --experimental-transform-types
 * which does the actual type stripping / code generation.
 */
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

export async function resolve(specifier: string, context: any, next: any) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[mc]?[jt]s$/.test(specifier)) {
    const base = context.parentURL ?? pathToFileURL(process.cwd() + "/").href;
    const candidate = new URL(specifier + ".ts", base);
    if (existsSync(fileURLToPath(candidate))) {
      return next(candidate.href, context);
    }
  }
  return next(specifier, context);
}

// Self-register when imported via --import so the hook applies to later imports.
register(import.meta.url, import.meta.url);
