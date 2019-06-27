import {Transform} from 'stream';

/**
 * Push an array of items into a Transform stream.
 * @param array The array you want to push to the stream.
 * @param stream The Transform stream into which array items are pushed.
 */
export async function split(
    array: Array<{}>, stream: Transform): Promise<boolean> {
  const arr = [].slice.call(array);
  let ended = false;

  for (const item of arr) {
    ended = !stream.writable || !stream.readable;

    if (!ended) {
      if (stream.write(item)) {
        continue;
      }
      await new Promise(resolve => stream.once('drain', resolve));
    }
  }

  return ended;
}
