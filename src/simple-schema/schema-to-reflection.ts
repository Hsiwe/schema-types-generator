import { isBoolean } from "fp-ts/lib/boolean";
import type {
  UnitReflectionReturnValue,
  UnitReflectionT,
} from "../schema-printer/schema-types";
import type { Unit } from "./schema";
import { isString } from "fp-ts/lib/string";
import { isDate } from "util/types";
import { isNumber } from "fp-ts/lib/number";

const unitToType = (unit: Unit): UnitReflectionReturnValue => {
  if ("value" in unit) {
    if (isBoolean(unit.value)) return "boolean";
    if (isString(unit.value)) return "string";
    if (isDate(unit.value)) return "date";
    if (isNumber(unit.value)) return "number";
  }
  return "recursive";
};

const singleUnitToSchema = (unit: Unit): UnitReflectionT => {
  const returnValue = unitToType(unit);

  if ("values" in unit && returnValue === "recursive")
    return {
      required: unit.required,
      key: unit.key,
      returnValue,
      values: unit.values.map(singleUnitToSchema),
    } satisfies UnitReflectionT;

  if (returnValue !== "recursive")
    return {
      key: unit.key,
      required: unit.required,
      returnValue,
    };

  throw new Error("Was not able to parse unit");
};

export const unitsToSchema: (xs: Unit[]) => UnitReflectionT[] = (xs) =>
  xs.map(singleUnitToSchema);
