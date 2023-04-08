import * as t from "io-ts";

const UnitReflection: t.Type<UnitReflectionT> = t.recursion(
  "UnitReflection",
  () =>
    t.union([
      t.type({
        required: t.boolean,
        key: t.string,
        returnValue: t.union([
          t.literal("string"),
          t.literal("number"),
          t.literal("boolean"),
          t.literal("date"),
        ]),
      }),
      t.type({
        required: t.boolean,
        key: t.string,
        returnValue: t.literal("recursive"),
        values: t.array(UnitReflection),
      }),
    ])
);

export type UnitReflectionReturnValue =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "recursive";

export type UnitReflectionT =
  | {
      required: boolean;
      key: string;
      returnValue: Exclude<UnitReflectionReturnValue, "recursive">;
    }
  | {
      required: boolean;
      key: string;
      returnValue: Extract<"recursive", UnitReflectionReturnValue>;
      values: UnitReflectionT[];
    };
