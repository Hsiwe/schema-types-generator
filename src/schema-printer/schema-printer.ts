import type {
  UnitReflectionReturnValue,
  UnitReflectionT,
} from './schema-types';
import ts from 'typescript';

const transform = (
  schema: UnitReflectionT[],
  treeName: string
): ts.InterfaceDeclaration => {
  return ts.factory.createInterfaceDeclaration(
    ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
    treeName,
    undefined,
    undefined,
    schema.flatMap(transformHelper)
  );
};

const selectNode = ts.factory.createTypeLiteralNode([
  ts.factory.createPropertySignature(
    undefined,
    'key',
    undefined,
    ts.factory.createTypeReferenceNode('string')
  ),
  ts.factory.createPropertySignature(
    undefined,
    'value',
    undefined,
    ts.factory.createTypeReferenceNode('string')
  ),
]);

const transformHelper = (unit: UnitReflectionT): ts.PropertySignature => {
  const typeMap: Record<
    Exclude<UnitReflectionReturnValue, 'recursive' | 'custom'>,
    ts.TypeNode
  > = {
    boolean: ts.factory.createTypeReferenceNode('boolean'),
    string: ts.factory.createTypeReferenceNode('string'),
    number: ts.factory.createTypeReferenceNode('number'),
    date: ts.factory.createTypeReferenceNode('Date'),
    unknown: ts.factory.createTypeReferenceNode('unknown'),
    select: selectNode,
  };

  const questionToken = !unit.required
    ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
    : undefined;

  if (unit.returnValue === 'recursive') 
    return ts.factory.createPropertySignature(
      undefined,
      unit.key,
      questionToken,
      ts.factory.createTypeLiteralNode(unit.values.map(transformHelper))
    );

  if(unit.returnValue === 'custom') return ts.factory.createPropertySignature(undefined, unit.key, questionToken, unit.type);

  return ts.factory.createPropertySignature(
    undefined,
    unit.key,
    questionToken,
    typeMap[unit.returnValue]
  );
};

export type SchemaTypeTree = string & {
  readonly SchemaTypeTree: unique symbol;
};

export function generateTypeTree(
  schema: UnitReflectionT[],
  treeName: string
): SchemaTypeTree {
  const transformedSchema = transform(schema, treeName);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  return printer.printNode(
    ts.EmitHint.Unspecified,
    transformedSchema,
    ts.createSourceFile(
      'sourceFile.ts',
      '',
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    )
  ) as SchemaTypeTree;
}
