import * as assert from 'assert';
import {Readable} from 'stream';

import {SplitArrayStream} from '../src';

describe('split-array-stream', () => {
  const array = [
    {id: 1, user: 'Dave'}, {id: 2, user: 'Dave'}, {id: 3, user: 'Dave'},
    {id: 4, user: 'Stephen'}
  ];

  describe('stream mode', () => {
    let arrayStream: Readable;

    beforeEach(() => {
      arrayStream = new Readable({
        objectMode: true,
        read() {
          this.push(array);
          this.push(null);
        },
      });
    });

    it('should work', done => {
      let numDataEvents = 0;

      arrayStream.pipe(new SplitArrayStream())
          .on('data', () => numDataEvents++)
          .on('end', () => {
            assert.strictEqual(numDataEvents, array.length);
            done();
          });
    });

    it('should not push more results after end', done => {
      const expectedNumDataEvents = 2;
      let numDataEvents = 0;

      const sas = new SplitArrayStream();

      arrayStream.pipe(sas)
          .on('data',
              () => {
                numDataEvents++;
                if (numDataEvents === expectedNumDataEvents) {
                  sas.end();
                }
                if (numDataEvents > expectedNumDataEvents) {
                  throw new Error('Should not have received this event.');
                }
              })
          .on('end', () => {
            assert.strictEqual(numDataEvents, expectedNumDataEvents);
            done();
          });
    });

    it('should not modify original array', done => {
      const expectedArray = [].slice.call(array);

      arrayStream.pipe(new SplitArrayStream())
          .on('data', () => {})
          .on('end', () => {
            assert.deepStrictEqual(array, expectedArray);
            done();
          });
    });
  });

  describe('function mode', () => {
    let numTimesCalled: number;

    const getArrayFn = () => {
      numTimesCalled++;

      if (numTimesCalled === 1) {
        return Promise.resolve(array);
      } else {
        return Promise.resolve(null);
      }
    };

    beforeEach(() => {
      numTimesCalled = 0;
    });

    it('should work', done => {
      let numDataEvents = 0;

      new SplitArrayStream(getArrayFn)
          .on('data', () => numDataEvents++)
          .on('end', () => {
            assert.strictEqual(numDataEvents, array.length);
            done();
          });
    });

    it('should not push more results after end', done => {
      const expectedNumDataEvents = 2;
      let numDataEvents = 0;

      const sas =
          new SplitArrayStream(getArrayFn)
              .on('data',
                  () => {
                    numDataEvents++;
                    if (numDataEvents === expectedNumDataEvents) {
                      sas.end();
                    }
                    if (numDataEvents > expectedNumDataEvents) {
                      throw new Error('Should not have received this event.');
                    }
                  })
              .on('end', () => {
                assert.strictEqual(numDataEvents, expectedNumDataEvents);
                done();
              });
    });

    it('should not modify original array', done => {
      const expectedArray = [].slice.call(array);

      new SplitArrayStream(getArrayFn).on('data', () => {}).on('end', () => {
        assert.deepStrictEqual(array, expectedArray);
        done();
      });
    });
  });

  describe('array mode', () => {
    it('should work', done => {
      let numDataEvents = 0;

      new SplitArrayStream(array)
          .on('data', () => numDataEvents++)
          .on('end', () => {
            assert.strictEqual(numDataEvents, array.length);
            done();
          });
    });

    it('should not push more results after end', done => {
      const expectedNumDataEvents = 2;
      let numDataEvents = 0;

      const sas =
          new SplitArrayStream(array)
              .on('data',
                  () => {
                    numDataEvents++;
                    if (numDataEvents === expectedNumDataEvents) {
                      sas.end();
                    }
                    if (numDataEvents > expectedNumDataEvents) {
                      throw new Error('Should not have received this event.');
                    }
                  })
              .on('end', () => {
                assert.strictEqual(numDataEvents, expectedNumDataEvents);
                done();
              });
    });

    it('should not modify original array', done => {
      const expectedArray = [].slice.call(array);

      new SplitArrayStream(array).on('data', () => {}).on('end', () => {
        assert.deepStrictEqual(array, expectedArray);
        done();
      });
    });
  });
});
