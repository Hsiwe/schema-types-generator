import * as T from 'fp-ts/lib/Task';
import { pipe, flow } from 'fp-ts/lib/function';
import { ask, putStrLn } from './lib/io';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { printType } from './lib/ts-helpers';
import * as TE from 'fp-ts/lib/TaskEither';
import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';

import { UnitReflectionT } from './schema-printer/schema-types';
import { createTypeLiteralNode, createTypeTree } from './schema-printer/schema-printer';
import {
  Snapshot,
  createSnapshot,
  deleteSnapshotByHash,
  insertSnapshot,
  parseSourceFileToSnapshots,
  snapshotsToUnionType,
} from './schema-snapshots/snapshot';

interface ConfigurationSchema<T> {
  name: string;
  snapshotAlias?: string;
  singleTypeAlias?: string;
  units: T[];
  inspect?: {
    loadData: () => Promise<T[][]>;
    cleanup: () => Promise<void>;
  };
}

export type Configuration<T> = {
  schemas: ConfigurationSchema<T>[];
  snapshotsDir: string;
  singleDir: string;
  unitsToReflection: (units: T[]) => UnitReflectionT[];
};

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
    T.flatMap(() => putStrLn('Deleted snapshot')),
    T.flatMap(() => T.of(undefined))
  );

const inspectProgram = (
  getReflection: () => T.Task<UnitReflectionT[][]>,
  schemaName: string,
  dirPath: string,
  snapshotAlias?: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.apS('reflections', getReflection()),
    T.bind('pathToFile', () => T.of(`${dirPath}/${schemaName}_snapshot.ts`)),
    T.bind('type', ({ reflections }) =>
      T.of(
        printType(
          snapshotsToUnionType(
            snapshotAlias || schemaName,
            reflections.map((reflection) =>
              createSnapshot('Inspected', createTypeLiteralNode(reflection))
            )
          )
        )
      )
    ),
    T.tap(({ type, pathToFile }) => T.of(writeFileSync(pathToFile, type))),
    T.flatMap(() => putStrLn('Created snapshots from inspected types')),
    T.flatMap(() => T.of(undefined))
  );

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
      // TODO: This message is not correct sometimes. When hash doesn't change we don't modify the title
      putStrLn(
        `Created a snapshot for schema "${schemaName}" with hash: ${snapshot.hash}, title: "${snapshot.title}" at "${dirPath}"`
      )
    ),
    T.flatMap(() => T.of(undefined))
  );

const printSingleTypeProgram = <T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string,
  dirPath: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.flatMap(() =>
      T.of(
        writeFileSync(
          `${dirPath}/${treeName}.ts`,
          createTypeTree(transformF(units), `${treeName}Temp`)
        )
      )
    ),
    T.flatMap(() => putStrLn('Created single type')),
    T.flatMap(() => T.of(undefined))
  );

const dirInitProgram = (path: string): T.Task<void> =>
  pipe(
    T.Do,
    T.tap(() => putStrLn(`Initiating dir at ${path}`)),
    T.flatMap(() =>
      T.of(async () => {
        if (!existsSync(path)) return mkdirSync(path);
      })
    ),
    T.flatMap(() => putStrLn(`Initiated dir at ${path}`)),
    T.flatMap(() => T.of(undefined))
  );

function shouldContinue(): T.Task<boolean> {
  return pipe(
    ask('Do you want to continue generating types (y/n)?'),
    T.flatMap((answer) => {
      switch (answer.toLowerCase()) {
        case 'y':
          return T.of(true);
        case 'n':
          return T.of(false);
        default:
          return shouldContinue();
      }
    })
  );
}

function selectSchema<T>(schemas: ConfigurationSchema<T>[]): T.Task<ConfigurationSchema<T>> {
  return pipe(
    T.Do,
    T.flatMap(() => putStrLn(`Available schemas: \n${schemas.map((x) => x.name).join('\n')}`)),
    T.flatMap(() => ask('Insert a schema name: ')),
    T.flatMap((answer) => {
      const schema = schemas.find((x) => x.name === answer);
      return schema ? T.of(schema) : selectSchema(schemas);
    })
  );
}

const actionMap = {
  // TODO: create_snapshot is useless when we use it on the same schema inside a loop
  // (because loop uses the same schema so hash will always be the same).
  // Either somehow reload the schema on the fly or notify users that they need to
  // restart the loop if they want to create a new snapshot.
  '1': { key: 'create_snapshot', desc: 'Create snapshot' },
  '2': { key: 'delete_snapshot', desc: 'Delete snapshot' },
  '3': { key: 'create_single', desc: 'Create single type' },
  '4': { key: 'inspect', desc: 'Create multiple snapshots from data' },
} as const;
type ConfigAction = (typeof actionMap)[keyof typeof actionMap]['key'];
function getActionsForSchema(schema: ConfigurationSchema<unknown>): Partial<typeof actionMap> {
  if (schema.inspect) return actionMap;
  return { '1': actionMap['1'], '2': actionMap['2'], '3': actionMap['3'] };
}
function selectAction(schema: ConfigurationSchema<unknown>): T.Task<ConfigAction> {
  return pipe(
    T.Do,
    T.flatMap(() =>
      putStrLn(
        // eslint-disable-next-line prettier/prettier
        `Available actions: \n${
        Object.entries(getActionsForSchema(schema))
          .map(([key, val]) => `${key}: ${val.desc}`)
          .join('\n')}`
      )
    ),
    T.flatMap(() => ask('Insert action number: ')),
    T.flatMap((answer) => {
      if (!Object.keys(actionMap).includes(answer)) return selectAction(schema);
      return T.of(actionMap[answer as keyof typeof actionMap]['key']);
    })
  );
}

function actOnAction<T>(
  config: Configuration<T>,
  schema: ConfigurationSchema<T>,
  action: ConfigAction
): T.Task<void> {
  return pipe(
    T.Do,
    T.flatMap(() => {
      const inspect = schema.inspect;
      switch (action) {
        case 'create_single':
          return printSingleTypeProgram(
            config.unitsToReflection,
            schema.units,
            schema.singleTypeAlias || schema.name,
            config.singleDir
          );
        case 'create_snapshot':
          return printSnapshotProgram(
            config.unitsToReflection,
            schema.units,
            schema.snapshotAlias || schema.name,
            config.snapshotsDir
          );
        case 'delete_snapshot':
          return deleteSnapshotProgram(schema.name, config.snapshotsDir);
        case 'inspect':
          if (inspect) {
            return inspectProgram(
              () =>
                pipe(
                  T.Do,
                  T.apS('units', async () => inspect.loadData()),
                  T.tap(() => T.of(inspect.cleanup())),
                  T.flatMap(({ units }) => T.of(units.map(config.unitsToReflection)))
                ),
              schema.name,
              config.snapshotsDir,
              schema.snapshotAlias
            );
          }
          return T.of(undefined);
      }
    })
  );
}
const generatingLoop = <T>(config: Configuration<T>): T.Task<void> =>
  pipe(
    T.Do,
    T.bind('schema', () => selectSchema(config.schemas)),
    T.bind('action', ({ schema }) => selectAction(schema)),
    T.flatMap(({ action, schema }) => actOnAction(config, schema, action)),
    T.flatMap(() => shouldContinue()),
    T.flatMap((answer) => (answer ? generatingLoop(config) : T.of(undefined)))
  );

export const initConfigurationProgram = <T>(config: Configuration<T>): T.Task<void> =>
  pipe(
    T.Do,
    T.tap(() => putStrLn('Loading configuration')),
    T.flatMap(() => dirInitProgram(config.snapshotsDir)),
    T.flatMap(() => dirInitProgram(config.singleDir)),
    T.tap(() => putStrLn('Initiated directories')),
    T.flatMap(() => generatingLoop(config))
  );
