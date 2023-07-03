import ts from 'typescript';
import hasher from 'node-object-hash';
import { instanceToPlain } from 'class-transformer';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { arrayToUnionType } from '../lib/ts-helpers';
import { pipe } from 'fp-ts/lib/function';

export interface Snapshot {
  title: string;
  hash: string;
  type: ts.TypeLiteralNode;
}

export interface SnapshotPrinted {
  title: string;
  hash: string;
  type: any;
}

export function snapshotToType(snapshot: Snapshot): ts.TypeLiteralNode {
  const typeElem = ts.factory.createPropertySignature(undefined, 'type', undefined, snapshot.type);

  const hashElem = ts.factory.createPropertySignature(
    undefined,
    'hash',
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(snapshot.hash))
  );

  const titleElem = ts.factory.createPropertySignature(
    undefined,
    'title',
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(snapshot.title))
  );

  return ts.factory.createTypeLiteralNode([titleElem, hashElem, typeElem]);
}

export function createSnapshot(title: string, nodes: ts.TypeLiteralNode): Snapshot {
  const strictHasher = hasher();

  const hash = strictHasher.hash(instanceToPlain(nodes));

  return {
    hash,
    title,
    type: nodes,
  };
}

export type SnapshotType = string & {
  readonly SnapshotType: unique symbol;
};

function typeLiteralObjToSnapshot(literal: ts.TypeLiteralNode): O.Option<Snapshot> {
  const members = literal.members;

  let hash: string | undefined;
  // TODO: too ugly and doesn't cover any edge cases, refactor
  const hashMember = members
    .filter((x): x is ts.PropertySignature => x.kind === ts.SyntaxKind.PropertySignature)
    .find((x) => 'escapedText' in x.name && x.name.escapedText === 'hash');
  if (hashMember?.type && hashMember.type.kind === ts.SyntaxKind.LiteralType) {
    hash = (hashMember.type as any).literal.text;
  }

  let title: string | undefined;
  const titleMember = members
    .filter((x): x is ts.PropertySignature => x.kind === ts.SyntaxKind.PropertySignature)
    .find((x) => 'escapedText' in x.name && x.name.escapedText === 'title');
  if (titleMember?.type && titleMember.type.kind === ts.SyntaxKind.LiteralType) {
    title = (titleMember.type as any).literal.text;
  }

  let type: ts.TypeLiteralNode | undefined;
  const typeMember = members
    .filter((x): x is ts.PropertySignature => x.kind === ts.SyntaxKind.PropertySignature)
    .find((x) => 'escapedText' in x.name && x.name.escapedText === 'type');
  if (typeMember?.type && typeMember.type.kind === ts.SyntaxKind.TypeLiteral) {
    type = typeMember.type as ts.TypeLiteralNode;
  }

  if (!type || !hash || !title) return O.none;
  return O.of({ hash, title, type });
}

export function parseSourceFileToSnapshots(source: string): O.Option<Snapshot[]> {
  const node = ts.createSourceFile('', source, ts.ScriptTarget.Latest);

  const snapshots: Snapshot[] = [];
  node.forEachChild((child) => {
    if (ts.SyntaxKind[child.kind] === 'TypeAliasDeclaration' && 'type' in child) {
      const unionTypeDeclaration = child as ts.TypeAliasDeclaration;

      // If type declaration has only one type literal object then all the properties of
      // this type liter object will be stored in 'members' property. Otherwise, if there are
      // multiple type objects(we have an actual union) then these objects will be stored
      // in a 'types' property
      const isSingleType = 'members' in unionTypeDeclaration.type;
      if (isSingleType) {
        const snapshot = typeLiteralObjToSnapshot(unionTypeDeclaration.type as ts.TypeLiteralNode);
        O.fold<Snapshot, undefined | number>(
          () => undefined,
          (snapshot) => snapshots.push(snapshot)
        )(snapshot);
      } else {
        const optionSnapshots: O.Option<Snapshot>[] = (unionTypeDeclaration.type as any).types.map(
          typeLiteralObjToSnapshot
        );
        pipe(
          O.sequenceArray(optionSnapshots),
          O.fold(
            () => undefined,
            (parsedSnapshots) => snapshots.push(...parsedSnapshots)
          )
        );
      }
    }
  });

  if (!snapshots.length) return O.none;
  return O.of(snapshots);
}

export function insertSnapshot(snapshots: readonly Snapshot[], snapshot: Snapshot): Snapshot[] {
  if (!snapshots.find((x) => x.hash === snapshot.hash)) return [...snapshots, snapshot];
  return [...snapshots];
}

export function deleteSnapshotByHash(
  snapshots: readonly Snapshot[],
  hash: string
  // TODO: use fp-ts arrays
): E.Either<string, Snapshot[]> {
  const index = snapshots.findIndex((x) => x.hash === hash);
  if (index === -1) return E.left(`Snapshot with hash ${hash} was not found`);

  return E.right(snapshots.slice(0, index).concat(snapshots.slice(index + 1)));
}

export function snapshotsToUnionType(
  typeName: string,
  snapshots: Snapshot[]
): ts.TypeAliasDeclaration {
  return arrayToUnionType(typeName, snapshots, snapshotToType);
}
