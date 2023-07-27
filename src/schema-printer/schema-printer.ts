import { printType } from '../lib/ts-helpers';
import type { UnitReflectionReturnValue, UnitReflectionT } from './schema-types';
import ts from 'typescript';

const transform = (schema: UnitReflectionT[], treeName: string): ts.InterfaceDeclaration => {
  return ts.factory.createInterfaceDeclaration(
    ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
    treeName,
    undefined,
    undefined,
    schema.map(transformHelper)
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

const decideKeyStrategy = (
  unit: UnitReflectionT
): ((returnType: ts.TypeNode) => ts.TypeElement) => {
  const questionToken = !unit.required
    ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
    : undefined;

  const { key } = unit;
  if (typeof key === 'string')
    return (returnType) =>
      ts.factory.createPropertySignature(undefined, key, questionToken, returnType);
  return (returnType) =>
    ts.factory.createIndexSignature(
      undefined,
      [ts.factory.createParameterDeclaration(undefined, undefined, 'key', undefined, key)],
      returnType
    );
};

const transformHelper = (unit: UnitReflectionT): ts.TypeElement => {
  const typeMap: Record<Exclude<UnitReflectionReturnValue, 'recursive' | 'custom'>, ts.TypeNode> = {
    boolean: ts.factory.createTypeReferenceNode('boolean'),
    string: ts.factory.createTypeReferenceNode('string'),
    number: ts.factory.createTypeReferenceNode('number'),
    date: ts.factory.createTypeReferenceNode('Date'),
    unknown: ts.factory.createTypeReferenceNode('unknown'),
    null: ts.factory.createLiteralTypeNode(ts.factory.createNull()),
    undefined: ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    object: ts.factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
    select: selectNode,
  };

  const strategy = decideKeyStrategy(unit);

  let type: ts.TypeNode | undefined;

  if (unit.returnValue === 'recursive')
    type = ts.factory.createTypeLiteralNode(unit.values.map(transformHelper));
  else if (unit.returnValue === 'custom') type = unit.type;
  else
    type = Array.isArray(unit.returnValue)
      ? ts.factory.createUnionTypeNode(unit.returnValue.map((val) => typeMap[val]))
      : typeMap[unit.returnValue];

  return strategy(type);
};

export type SchemaTypeTree = string & {
  readonly SchemaTypeTree: unique symbol;
};

export function createTypeTree(schema: UnitReflectionT[], treeName: string): SchemaTypeTree {
  const transformedSchema = transform(schema, treeName);

  return printType(transformedSchema) as SchemaTypeTree;
}

export function createTypeLiteralNode(schema: UnitReflectionT[]): ts.TypeLiteralNode {
  return ts.factory.createTypeLiteralNode(schema.map(transformHelper));
}
