import { createTypeLiteralNode, createTypeTree } from './schema-printer/schema-printer';
import type { UnitReflectionT } from './schema-printer/schema-types';
import { writeFile, mkdir } from 'fs/promises';
import { createSnapshot } from './schema-snapshots/create-snapshot';
import * as T from 'fp-ts/lib/Task';
import { pipe } from 'fp-ts/lib/function';
import { ask, putStrLn } from './lib/io';
import { existsSync } from 'fs';

const printTreeProgram = <T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string,
  dirPath: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.flatMap(() =>
      T.of(async () => {
        if (!existsSync(dirPath)) return mkdir(dirPath);
      })
    ),
    T.flatMap(() =>
      T.of(writeFile(`${dirPath}/${treeName}.ts`, createTypeTree(transformF(units), treeName)))
    ),
    T.flatMap(() => T.of(undefined))
  );
export async function printTree<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string,
  dirPath: string
): Promise<void> {
  await printTreeProgram(transformF, units, treeName, dirPath)();
}

const printSnapshotProgram = <T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  dirPath: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.apS('title', ask('Insert the title of a snapshot: ')),
    T.flatMap(({ title }) => {
      const type = createTypeLiteralNode(transformF(units));
      const snapshot = createSnapshot(title, type);
      return putStrLn(
        `Created a snapshot with hash: ${snapshot.hash}, title: "${snapshot.title}" at "${dirPath}"`
      );
    }),
    T.flatMap(() => T.of(undefined))
  );

export async function printSnapshot<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  dirPath: string
) {
  // TODO: print snapshot to a file
  // TODO: add interactivity
  printSnapshotProgram(transformF, units, dirPath)();
}
