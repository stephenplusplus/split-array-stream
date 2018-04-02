import * as assert from 'assert';
import * as through from 'through2';
import {split} from '../src';

describe('split-array-stream', () => {
  const array = [
    {id: 1, user: 'Dave'}, {id: 2, user: 'Dave'}, {id: 3, user: 'Dave'},
    {id: 4, user: 'Stephen'}
  ];

  it('should work', async () => {
    let numDataEvents = 0;
    const stream = through.obj();
    stream.on('data', () => numDataEvents++);
    const streamEnded = await split(array, stream);
    assert.strictEqual(streamEnded, false);
    assert.strictEqual(numDataEvents, array.length);
  });

  it('should not push more results after end', async () => {
    const stream = through.obj();
    const expectedNumDataEvents = 2;
    let numDataEvents = 0;
    stream.on('data', d => {
      numDataEvents++;
      if (numDataEvents === expectedNumDataEvents) {
        stream.end();
      }
      if (numDataEvents > expectedNumDataEvents) {
        throw new Error('Should not have received this event.');
      }
    });
    const ended = await split(array, stream);
    assert.strictEqual(ended, true);
    assert.strictEqual(numDataEvents, expectedNumDataEvents);
  });

  it('should not modify original array', async () => {
    const expectedArray = [].slice.call(array);
    const ended = await split(array, through.obj());
    assert.deepEqual(array, expectedArray);
  });
});
