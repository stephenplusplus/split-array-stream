import * as ended from 'is-stream-ended';
import {Transform} from 'stream';

/**
 * Push an array of items into a Transform stream.
 * @param array The array you want to push to the stream.
 * @param stream The Transform stream into which array items are pushed.
 */
export async function split(array: Array<{}>, stream: Transform) {
  return new Promise<boolean>((resolve, reject) => {
    const arr = [].slice.call(array);
    function loopyloop() {
      // Ensure the stream wasn't closed by the consumer.
      const isEnded = ended(stream);
      // Ensure al items from the array haven't been pushed.
      const cont = !isEnded && arr.length > 0;
      if (cont) {
        stream.push(arr.shift());
        // For large arrays, use setImmediate to ensure other microtasks
        // and I/O operations have a chance to execute.
        setImmediate(loopyloop);
      } else {
        resolve(isEnded);
      }
    }
    loopyloop();
  });
}
