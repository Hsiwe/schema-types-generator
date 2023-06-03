import { printTree } from '..';
import { simpleSchema } from './schema';
import { unitsToSchema } from './schema-to-reflection';

(async () => {
  await printTree(unitsToSchema, simpleSchema, 'ExampleTree');
})();
