import ts from 'typescript';

export type UnitReflectionKey = string | ts.TemplateLiteralTypeNode;

export type UnitReflectionReturnValue =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'null'
  | 'undefined'
  | 'object'
  | 'recursive'
  | 'select'
  | 'custom'
  | 'unknown';

export type UnitReflectionPrimitiveReturnValue = Exclude<
  UnitReflectionReturnValue,
  'recursive' | 'custom'
>;

export type UnitReflectionT =
  | {
      required: boolean;
      key: UnitReflectionKey;
      returnValue: UnitReflectionPrimitiveReturnValue | UnitReflectionPrimitiveReturnValue[];
    }
  | {
      required: boolean;
      key: UnitReflectionKey;
      returnValue: Extract<'recursive', UnitReflectionReturnValue>;
      values: UnitReflectionT[];
    }
  | {
      required: boolean;
      key: UnitReflectionKey;
      returnValue: Extract<'custom', UnitReflectionReturnValue>;
      type: ts.TypeNode;
    };
