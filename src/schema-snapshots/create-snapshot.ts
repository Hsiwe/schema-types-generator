import ts from 'typescript';
import { hasher } from 'node-object-hash';
import { instanceToPlain } from 'class-transformer';

export interface Snapshot {
  title: string;
  hash: string;
  type: ts.TypeLiteralNode;
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
