import ts from 'typescript';

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
