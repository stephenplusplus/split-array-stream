import {Transform} from 'stream';

// tslint:disable-next-line no-any
export type ArrayItem = any;

/**
 * Push an array of items into a Transform stream.
 * @param {array|function} [getArrayFn] If an array is provided, the elements in
 *     the array will be individually written to a stream that is connected to
 *     the returned `split-array-stream` stream. If a function is provided, it
 *     will be called every time a destination stream is ready for more data.
 */
export class SplitArrayStream extends Transform {
  private _ended: boolean;
  private _getArrayFn?: Function;
  private _queuedArray: ArrayItem[];

  constructor(getArrayFn?: Function|ArrayItem[]) {
    super({objectMode: true});

    this._ended = false;
    this._queuedArray = [];

    if (Array.isArray(getArrayFn)) {
      // When the input is an array, the user just wants it split up and emitted
      // as data events.
      const array = [].slice.call(getArrayFn).concat([null]);
      this.getArrayFn = () => Promise.resolve(array);
      this._read = this._readFromArrayFn.bind(this);
    } else if (typeof getArrayFn === 'function') {
      // When the input is a function, the user wants that function called each
      // time the destination stream is ready for more data.
      this._getArrayFn = getArrayFn;
      this._read = this._readFromArrayFn.bind(this);
    }
  }

  // tslint:disable-next-line no-any
  end(...args: any[]) {
    this._ended = true;
    return super.end(...args);
  }

  _transform(array: ArrayItem[], enc: string, next: Function) {
    this._queue(array);
    this._flushQueue();
    next();
  }

  _flush(callback: Function) {
    const MAX_FORCED_FLUSH_ATTEMPTS = 3;
    let numForceFlushAttempts = 0;

    const flush = (callback: Function) => {
      const consumerStreamReady = this._flushQueue();

      if (this._queuedArray.length === 0) {
        callback();
        return;
      }

      // More results exist.
      if (consumerStreamReady) {
        setImmediate(flush, callback);
      } else {
        // The stream isn't going to ask for more data by itself anymore, since
        // we're in the _flush() handler.

        if (numForceFlushAttempts < MAX_FORCED_FLUSH_ATTEMPTS) {
          // We can try a few times to drain the queued array items, but
          // probably shouldn't overdo it.
          numForceFlushAttempts++;
          setImmediate(flush, callback);
        } else {
          // Ok, just let the data drop.
          callback();
        }
      }
    };

    flush(callback);
  }

  // Gets mapped to `_read` when appropriate (see constructor).
  private _readFromArrayFn() {
    const read = async () => {
      try {
        let array = await this._getArrayFn!();

        if (!Array.isArray(array)) {
          array = [array];
        }

        this._queue(array);

        const consumerStreamReady = this._flushQueue();

        if (consumerStreamReady) {
          read();
        }
      } catch (e) {
        // If the user rejects the `getArrayFn` function's returned Promise, we
        // consider it an error to destroy the stream with.
        this.destroy(e);
      }
    };

    read();
  }

  private _flushQueue() {
    return this._emitArray(this._queuedArray);
  }

  private _queue(array: ArrayItem[]) {
    this._queuedArray = this._queuedArray.concat(array);
  }

  private _emitArray(array: ArrayItem[]) {
    let consumerStreamReady = true;
    let numItemsEmitted = 0;

    for (const arrayItem of array) {
      if (this._ended || !consumerStreamReady) {
        break;
      }
      numItemsEmitted++;
      consumerStreamReady = this.push(arrayItem);
    }

    this._queuedArray = array.slice(numItemsEmitted);

    return consumerStreamReady && !this._ended;
  }
}