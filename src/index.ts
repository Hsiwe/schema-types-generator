import { createTypeLiteralNode, createTypeTree } from './schema-printer/schema-printer';
import type { UnitReflectionT } from './schema-printer/schema-types';
import {
  Snapshot,
  SnapshotPrinted,
  createSnapshot,
  deleteSnapshotByHash,
  insertSnapshot,
  parseSourceFileToSnapshots,
  snapshotsToUnionType,
} from './schema-snapshots/snapshot';
import * as T from 'fp-ts/lib/Task';
import { pipe, flow } from 'fp-ts/lib/function';
import { ask, putStrLn } from './lib/io';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { printType } from './lib/ts-helpers';
import * as TE from 'fp-ts/lib/TaskEither';
import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';

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
        if (!existsSync(dirPath)) return mkdirSync(dirPath);
      })
    ),
    T.flatMap(() =>
      T.of(writeFileSync(`${dirPath}/${treeName}.ts`, createTypeTree(transformF(units), treeName)))
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
  schemaName: string,
  dirPath: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.bind('pathToFile', () => T.of(`${dirPath}/${schemaName}_snapshot.ts`)),
    T.apS(
      'source',
      pipe(
        TE.tryCatch(
          async () => readFileSync(`${dirPath}/${schemaName}_snapshot.ts`, 'utf-8'),
          (reason) => new Error(`${reason}`)
        ),
        TE.fold(() => T.of(undefined), T.of)
      )
    ),
    T.tap(({ source, pathToFile }) =>
      typeof source === 'string' ? T.of(undefined) : T.of(writeFileSync(pathToFile, ''))
    ),
    T.bind('snapshots', ({ source }) => T.of(parseSourceFileToSnapshots(source || ''))),
    T.apS('title', ask('Insert the title of a snapshot: ')),
    T.bind('type', () => T.of(createTypeLiteralNode(transformF(units)))),
    T.bind('snapshot', ({ title, type }) => T.of(createSnapshot(title, type))),
    T.bind('typeStr', ({ snapshots, snapshot }) =>
      T.of(
        pipe(
          O.fold<Snapshot[], string>(
            () => flow(snapshotsToUnionType.bind(undefined, schemaName), printType)([snapshot]),
            (snapshots) =>
              printType(snapshotsToUnionType(schemaName, insertSnapshot(snapshots, snapshot)))
          )
        )(snapshots)
      )
    ),
    T.tap(({ typeStr, pathToFile }) => T.of(writeFileSync(pathToFile, typeStr))),
    T.flatMap(({ snapshot }) =>
      putStrLn(
        `Created a snapshot for schema "${schemaName}" with hash: ${snapshot.hash}, title: "${snapshot.title}" at "${dirPath}"`
      )
    ),
    T.flatMap(() => T.of(undefined))
  );

const deleteSnapshotProgram = (schemaName: string, dirPath: string): T.Task<void> =>
  pipe(
    T.Do,
    T.apS('hash', ask('Insert the hash of a snapshot: ')),
    T.bind('pathToFile', () => T.of(`${dirPath}/${schemaName}_snapshot.ts`)),
    T.apS(
      'source',
      pipe(
        TE.tryCatch(
          async () => readFileSync(`${dirPath}/${schemaName}_snapshot.ts`, 'utf-8'),
          (reason) => new Error(`${reason}`)
        ),
        TE.fold(() => T.of(undefined), T.of)
      )
    ),
    T.bind('snapshots', ({ source }) =>
      T.of(
        pipe(
          parseSourceFileToSnapshots(source || ''),
          O.fold(
            () => [],
            (snapshots) => snapshots
          )
        )
      )
    ),
    T.bind('newSnapshots', ({ snapshots, hash }) => T.of(deleteSnapshotByHash(snapshots, hash))),
    T.tap(({ newSnapshots, pathToFile }) =>
      E.fold<string, Snapshot[], T.Task<void>>(
        (left) => putStrLn(`Was not able to delete a snapshot. Error: ${left}`),
        (right) =>
          right.length === 0
            ? T.of(writeFileSync(pathToFile, ''))
            : T.of(writeFileSync(pathToFile, printType(snapshotsToUnionType(schemaName, right))))
      )(newSnapshots)
    ),
    T.flatMap(() => T.of(undefined))
  );
export async function printSnapshot<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  schemaName: string,
  dirPath: string
) {
  // TODO: add interactivity
  printSnapshotProgram(transformF, units, schemaName, dirPath)();
}

export async function deleteSnapshot(schemaName: string, dirPath: string) {
  return deleteSnapshotProgram(schemaName, dirPath)();
}

export type ExtractTypeFromSnapshots<T extends SnapshotPrinted> = T['type'];
