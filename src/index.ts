import { createTypeLiteralNode, createTypeTree } from './schema-printer/schema-printer';
import type { UnitReflectionT } from './schema-printer/schema-types';
import { writeFile, mkdir } from 'fs/promises';
import { createSnapshot } from './schema-snapshots/create-snapshot';

export async function printTree<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string,
  dirPath: string
): Promise<void> {
  await mkdir(dirPath);

  await writeFile(`${dirPath}/${treeName}.ts`, createTypeTree(transformF(units), treeName));
}

export async function printSnapshot<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  snapshotTitle: string,
  dirPath: string
) {
  const type = createTypeLiteralNode(transformF(units));
  const snapshot = createSnapshot(snapshotTitle, type);

  // TODO: print snapshot to a file
  // TODO: add interactivity

  console.log(`Created a snapshot with hash ${snapshot.hash} in path ${dirPath}`);
}
