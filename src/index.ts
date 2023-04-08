import fs from "fs/promises";
import { generateTypeTree } from "./schema-printer/schema-printer";
import type { UnitReflectionT } from "./schema-printer/schema-types";

export async function printTree<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string
): Promise<void> {
  fs.writeFile(
    `./generated/${treeName}.ts`,
    generateTypeTree(transformF(units), treeName)
  );
}
