import { printSnapshot } from '..';
import { simpleSchema } from './schema';
import { unitsToSchema } from './schema-to-reflection';

(async () => {
  await printSnapshot(unitsToSchema, simpleSchema, 'ExampleTree', './generated');
})();
