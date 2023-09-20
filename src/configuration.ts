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
  /**
   * This name will be used for identifying schemas, should be unique. Also used as a default type
   * alias.
   */
  name: string;
  /** If provided will be used as an alias of created snapshots */
  snapshotAlias?: string;
  /** If provided will be used as an alias of created single types */
  singleTypeAlias?: string;
  /** Pre-built external schema */
  units: T[];
  /**
   * For special cases where you want to retroactively create snapshots from some already existing
   * data(e.g. database)
   */
  inspect?: {
    loadData: () => Promise<T[][]>;
    /** Should close all open connections, file handles etc. */
    cleanup: () => Promise<void>;
  };
}

export type Configuration<T> = {
  schemas: ConfigurationSchema<T>[];
  /** Path(relative to the calling code) where to store generated snapshots. */
  snapshotsDir: string;
  /** Path(relative to the calling code) where to store generated single types. */
  singleDir: string;
  /** Transforms your schema units to an intermediate language */
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
  dirPath: string
): T.Task<void> =>
  pipe(
    T.Do,
    T.apS('reflections', getReflection()),
    T.bind('pathToFile', () => T.of(`${dirPath}/${schemaName}_snapshot.ts`)),
    T.bind('type', ({ reflections }) =>
      T.of(
        printType(
          snapshotsToUnionType(
            schemaName,
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
    T.flatMap(({ snapshot, typeStr, source }) =>
      putStrLn(
        // TODO: Find a better way to decide whether we inserted snapshot or not
        source !== typeStr
          ? `Created a snapshot for schema "${schemaName}" with hash: ${snapshot.hash}, title: "${snapshot.title}" at "${dirPath}"`
          : `Didn't create a snapshot because snapshot with hash ${snapshot.hash} already exists`
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
        writeFileSync(`${dirPath}/${treeName}.ts`, createTypeTree(transformF(units), `${treeName}`))
      )
    ),
    T.flatMap(() => putStrLn('Created single type')),
    T.flatMap(() => T.of(undefined))
  );

const dirInitProgram = (path: string): T.Task<void> =>
  pipe(
    T.Do,
    T.tap(() => (!existsSync(path) ? T.of(mkdirSync(path)) : T.of(undefined))),
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
    T.flatMap(() => putStrLn(`Available schemas: \n ${schemas.map((x) => x.name).join('\n ')}\n`)),
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
  '4': { key: 'create_single_and_snapshot', desc: 'Init schema(create single type and snapshot)' },
  '5': { key: 'inspect', desc: 'Create multiple snapshots from data' },
} as const;
type ConfigAction = (typeof actionMap)[keyof typeof actionMap]['key'];
function getActionsForSchema(schema: ConfigurationSchema<unknown>): Partial<typeof actionMap> {
  if (schema.inspect) return actionMap;
  return { '1': actionMap['1'], '2': actionMap['2'], '3': actionMap['3'], '4': actionMap['4'] };
}
function selectAction(schema: ConfigurationSchema<unknown>): T.Task<ConfigAction> {
  return pipe(
    T.Do,
    T.flatMap(() =>
      putStrLn(
        // eslint-disable-next-line prettier/prettier
        `\nAvailable actions: \n${
        Object.entries(getActionsForSchema(schema))
          .map(([key, val]) => ` ${key}: ${val.desc}`)
          .join('\n')}\n`
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
        case 'create_single_and_snapshot':
          return pipe(
            T.of(undefined),
            T.tap(() =>
              printSingleTypeProgram(
                config.unitsToReflection,
                schema.units,
                schema.singleTypeAlias || schema.name,
                config.singleDir
              )
            ),
            T.tap(() =>
              printSnapshotProgram(
                config.unitsToReflection,
                schema.units,
                schema.snapshotAlias || schema.name,
                config.snapshotsDir
              )
            )
          );
        case 'delete_snapshot':
          return deleteSnapshotProgram(schema.snapshotAlias || schema.name, config.snapshotsDir);
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
              schema.snapshotAlias || schema.name,
              config.snapshotsDir
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
    T.tap(() => putStrLn('Initiated directories\n')),
    T.flatMap(() => generatingLoop(config))
  );
