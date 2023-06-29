import ts from 'typescript';

export function printType(type: ts.Node): string {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.CarriageReturnLineFeed });

  return printer.printNode(
    ts.EmitHint.Unspecified,
    type,
    ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  );
}

export function arrayToUnionType<T>(
  typeName: string,
  xs: T[],
  transformer: (x: T) => ts.TypeNode
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    ts.factory.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
    typeName,
    undefined,
    ts.factory.createUnionTypeNode(xs.map(transformer))
  );
}
