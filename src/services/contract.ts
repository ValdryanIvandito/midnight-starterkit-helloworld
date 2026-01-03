import * as fs from "fs";
import * as path from "path";

/**
 * Load hasil compile kontrak Midnight
 *
 * Struktur yang diharapkan:
 * contracts/
 *   managed/
 *     <contract-name>/
 *       contract/
 *         index.cjs
 */
export async function loadContract<T = any>(
  contractPath: string,
  contractName: string,
  constructorArgs: Record<string, any> = {}
): Promise<T> {
  const contractModulePath = path.join(
    contractPath,
    "managed",
    contractName,
    "contract",
    "index.cjs"
  );

  if (!fs.existsSync(contractModulePath)) {
    throw new Error(
      [
        `Compiled contract not found.`,
        `Expected file: ${contractModulePath}`,
        `Have you run: npm run compile ?`,
      ].join("\n")
    );
  }

  const contractModule = await import(contractModulePath);

  if (!contractModule.Contract) {
    throw new Error(
      `Invalid contract module: "Contract" export not found in ${contractModulePath}`
    );
  }

  return new contractModule.Contract(constructorArgs);
}
