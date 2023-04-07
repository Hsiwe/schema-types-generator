import fs from "fs/promises";
import { generateTypeTree } from "./schema-printer/schema-printer";
import { simpleSchema } from "./simple-schema/schema";
import { unitsToSchema } from "./simple-schema/schema-to-reflection";

(async () => {
  fs.writeFile("./output/result.ts", generateTypeTree(unitsToSchema(simpleSchema)));
})();
