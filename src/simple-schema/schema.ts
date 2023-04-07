export type Unit = ValueUnit<string | number | boolean | Date> | ContainerUnit;

interface ValueUnit<T extends string | number | boolean | Date> {
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

class SimpleContainerUnit implements ContainerUnit {
  constructor(
    readonly required: boolean,
    readonly key: string,
    readonly values: Unit[]
  ) {}
}

export const simpleSchema = [
  new SimpleContainerUnit(true, "root", [
    new SimpleContainerUnit(true, "container_first", [
      new SimpleTextUnit(true, "third", "thirdvalue"),
      new SimpleTextUnit(false, "third2", "thirdvalue3"),
    ]),
    new SimpleTextUnit(false, "first", "value1"),
    new SimpleTextUnit(true, "second", "value2"),
    new SimpleNumberUnit(true, "number1", 6),
    new SimpleBooleanUnit(true, "boolean1", false),
  ]),
  new SimpleNumberUnit(true, "number3", 7),
  new SimpleDateUnit(true, "date1", new Date()),
];
