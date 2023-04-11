import path from "path";

import { generateTypeTree } from "./schema-printer/schema-printer";
import type { UnitReflectionT } from "./schema-printer/schema-types";
import { writeFileSync } from "fs";

export async function printTree<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string
): Promise<void> {
  const splitted = __dirname.split(path.sep);
  splitted.pop();
  splitted.push("generated");
  const newPath = splitted.join(path.sep);

  writeFileSync(
    `${newPath}/${treeName}.ts`,
    generateTypeTree(transformF(units), treeName)
  );
}
