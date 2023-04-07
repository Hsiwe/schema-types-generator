import fs from "fs/promises";
import { printSchema } from "./schema-printer/schema-printer";
import { simpleSchema } from "./simple-schema/schema";
import { unitsToSchema } from "./simple-schema/schema-to-reflection";

(async () => {
  fs.writeFile("./output/result.ts", printSchema(unitsToSchema(simpleSchema)));
})();
