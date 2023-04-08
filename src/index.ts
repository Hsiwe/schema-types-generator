import fs from "fs/promises";
import { generateTypeTree } from "./schema-printer/schema-printer";
import { simpleSchema } from "./simple-schema/schema";
import { unitsToSchema } from "./simple-schema/schema-to-reflection";
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

(async () => {
  await printTree(unitsToSchema,simpleSchema, "ExampleTree");
})();
