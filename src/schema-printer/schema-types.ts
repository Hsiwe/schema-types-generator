import ts from 'typescript';

export type UnitReflectionKey = string | ts.TemplateLiteralTypeNode;

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
      key: UnitReflectionKey;
      returnValue: Exclude<UnitReflectionReturnValue, 'recursive' | 'custom'>;
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
