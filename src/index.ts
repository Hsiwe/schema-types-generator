import { generateTypeTree } from './schema-printer/schema-printer';
import type { UnitReflectionT } from './schema-printer/schema-types';
import { writeFile, mkdir } from 'fs/promises';

export async function printTree<T>(
  transformF: (units: T[]) => UnitReflectionT[],
  units: T[],
  treeName: string,
  dirPath: string
): Promise<void> {
  await mkdir(dirPath);

  await writeFile(
    `${dirPath}/${treeName}.ts`,
    generateTypeTree(transformF(units), treeName)
  );
}
