import { Configuration, initConfigurationProgram } from './configuration';
import { SnapshotPrinted } from './schema-snapshots/snapshot';

export async function initConfiguration<T>(configuration: Configuration<T>): Promise<void> {
  try {
    return initConfigurationProgram(configuration)();
  } catch (error) {
    console.error('Error when working with schemas, aborting.', error);
  }
}

export { Configuration } from './configuration';
export type ExtractTypeFromSnapshots<T extends SnapshotPrinted> = T['type'];
