type UnitValue =
  | string
  | number
  | boolean
  | Date
  | { key: string; value: string };

export type Unit = ValueUnit<UnitValue> | ContainerUnit;

interface ValueUnit<T extends UnitValue> {
  readonly required: boolean;
  readonly key: string;
  readonly value: T;
}

interface ContainerUnit {
  readonly required: boolean;
  readonly key: string;
  readonly values: Unit[];
}

class SimpleTextUnit implements ValueUnit<string> {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly value: string
  ) {}
}

class SimpleDateUnit implements ValueUnit<Date> {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly value: Date
  ) {}
}

class SimpleNumberUnit implements ValueUnit<number> {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly value: number
  ) {}
}

class SimpleBooleanUnit implements ValueUnit<boolean> {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly value: boolean
  ) {}
}
class SimpleSelectUnit implements ValueUnit<{ value: string; key: string }> {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly value: { value: string; key: string }
  ) {}
}

class SimpleContainerUnit implements ContainerUnit {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly values: Unit[]
  ) {}
}

export const simpleSchema = [
  new SimpleContainerUnit(true, "root", [
    new SimpleContainerUnit(true, "first_containter", [
      new SimpleTextUnit(true, "text_unit_1", "text_unit_1_value"),
      new SimpleTextUnit(false, "text_unit_2", "text_unit_2_value"),
    ]),
    new SimpleTextUnit(false, "text_unit_3", "text_unit_3_value"),
    new SimpleTextUnit(true, "text_unit_4", "text_unit_4_value"),
    new SimpleNumberUnit(true, "number_unit_1", 1),
    new SimpleBooleanUnit(true, "boolean_unit_1", false),
    new SimpleSelectUnit(true, "select_unit_1", { key: "key", value: "value" }),
  ]),
  new SimpleNumberUnit(true, "number_unit_2", 2),
  new SimpleDateUnit(true, "date_unit_1", new Date()),
];
