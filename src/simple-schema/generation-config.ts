import { initConfiguration } from '..';
import { Configuration } from '../configuration';
import { Unit, simpleSchema } from './schema';
import { unitsToSchema } from './schema-to-reflection';

const config: Configuration<Unit> = {
  schemas: [
    {
      name: 'ExampleSchema',
      inspect: {
        loadData: async () => [simpleSchema],
        cleanup: async () => {},
      },
      units: simpleSchema,
    },
  ],
  snapshotsDir: './generated',
  singleDir: './generated',
  unitsToReflection: unitsToSchema,
};

(async () => await initConfiguration(config))();
