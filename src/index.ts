import {Transform} from 'stream';

// tslint:disable-next-line no-any
export type ArrayItem = any;

/**
 * Push an array of items into a Transform stream.
 * @param getArrayFn The array you want to push to the stream.
 */
export class SplitArrayStream extends Transform {
  private _ended: boolean;
  private _getArrayFn?: Function;

  constructor(getArrayFn?: Function|ArrayItem[]) {
    super({objectMode: true});

    this._ended = false;

    // When the input is an array, the user just wants it split up and emitted
    // as data events.
    if (Array.isArray(getArrayFn)) {
      const array = [].slice.call(getArrayFn);
      array.push(null);
      this._getArrayFn = () => Promise.resolve(array);
    }

    // When the input is a function, the user wants that function called each
    // time the destination stream is ready for more data.
    if (typeof getArrayFn === 'function') {
      this._getArrayFn = getArrayFn;
    }

    if (typeof getArrayFn !== 'undefined') {
      this._read = this._readFromFn.bind(this);
    }
  }

  // tslint:disable-next-line no-any
  end(...args: any[]) {
    this._ended = true;
    return super.end(...args);
  }

  async _readFromFn() {
    let consumerStreamReady = true;

    let arrayValue = await this._getArrayFn!();

    if (!Array.isArray(arrayValue)) {
      arrayValue = [arrayValue];
    }

    const array = [].slice.call(arrayValue);

    while (!this._ended && consumerStreamReady && array.length > 0) {
      consumerStreamReady = this.push(array.shift());
    }

    if (!this._ended && consumerStreamReady && array.length > 0) {
      setImmediate(() => this._read(0));
    }
  }

  _transform(array: ArrayItem[], enc: string, next: Function) {
    let consumerStreamReady = true;

    array = [].slice.call(array);

    while (!this._ended && consumerStreamReady && array.length > 0) {
      consumerStreamReady = this.push(array.shift());
    }

    if (this._ended) {
      next();
      return;
    }

    if (consumerStreamReady && array.length === 0) {
      next();
    } else {
      setImmediate(() => this._transform(array, enc, next));
    }
  }
}