import * as T from 'fp-ts/lib/Task';
import { flow, pipe } from 'fp-ts/lib/function';
import { log } from 'fp-ts/lib/Console';
import { createInterface } from 'readline';

export const getLine: T.Task<string> = () =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('> ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

export const putStrLn = flow(log, T.fromIO);

export const ask = (question: string) =>
  pipe(
    putStrLn(question),
    T.flatMap(() => getLine)
  );
