import * as t from 'io-ts';
import ts from 'typescript';

const UnitReflection: t.Type<UnitReflectionT> = t.recursion('UnitReflection', () =>
  t.union([
    t.type({
      required: t.boolean,
      key: t.string,
      returnValue: t.union([
        t.literal('string'),
        t.literal('number'),
        t.literal('boolean'),
        t.literal('date'),
        t.literal('select'),
        t.literal('unknown'),
      ]),
    }),
    t.type({
      required: t.boolean,
      key: t.string,
      returnValue: t.literal('recursive'),
      values: t.array(UnitReflection),
    }),
    t.type({
      required: t.boolean,
      key: t.string,
      returnValue: t.literal('custom'),
      type: t.any,
    }),
  ])
);

export type UnitReflectionReturnValue =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'recursive'
  | 'select'
  | 'custom'
  | 'unknown';

export type UnitReflectionT =
  | {
      required: boolean;
      key: string;
      returnValue: Exclude<UnitReflectionReturnValue, 'recursive' | 'custom'>;
    }
  | {
      required: boolean;
      key: string;
      returnValue: Extract<'recursive', UnitReflectionReturnValue>;
      values: UnitReflectionT[];
    }
  | {
      required: boolean;
      key: string;
      returnValue: Extract<'custom', UnitReflectionReturnValue>;
      type: ts.TypeNode;
    };
