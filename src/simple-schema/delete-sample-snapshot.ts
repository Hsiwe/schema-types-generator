import { deleteSnapshot } from '..';

(async () => {
  await deleteSnapshot('ExampleTree', './generated');
})();
