# split-array-stream
> Split an array's contents into multiple data events

```sh
$ npm install --save split-array-stream
```
```js
const SplitArrayStream = require('split-array-stream').SplitArrayStream

getReadableStreamThatEmitsArrays()
  .pipe(new SplitArrayStream())
  .on('data', (item) => {
    // { id: 1, user: 'Dave' }
    // ...later...
    // { id: 2, user: 'Stephen' }
  })
```

### Use case

Say you're getting many items from an upstream API. Multiple requests might be required to page through all of the results. You want to push the results to the stream as they come in, and only get more results if the user hasn't ended the stream.

```js
const SplitArrayStream = require('split-array-stream').SplitArrayStream

// Holds a pagination token the API expects.
let nextPageToken

const getUsersFromApi = async () => {
  const requestOptions = {
    method: 'GET',
    url: 'http://localhost:8000/users',
  }

  if (nextPageToken) {
    requestOptions.pageToken = nextPageToken
  }

  const response = await request(requestOptions)
  // response = {
  //   "users": [
  //     "callmehiphop",
  //     "stephenplusplus"
  //   ],
  //   "nextPageToken": "--key-used-for-pagination--"
  // }

  const users = response.users

  nextPageToken = response.nextPageToken

  if (!nextPageToken) {
    // When the API doesn't return a `nextPageToken`, all of the results have
    // been received.
    //
    // Signal the end of the stream by resolving with an array with a "null"
    // value inside.
    //
    // split-array-stream won't make any further calls to this function after
    // null is received.
    users.push(null)
  }

  return Promise.resolve(users)
}

new SplitArrayStream(getUsersFromApi)
  .on('data', function (user) {
    // First event:
    //   user = "callmehiphop"
    //
    // Second event:
    //   user = "stephenplusplus"
  })
  .on('end', function () {
    // All items from the array have been received
  })
```

Alternatively, you could find that turning the above behavior into a stream is cleaner.

```js
const Readable = require('stream').Readable
const SplitArrayStream = require('split-array-stream').SplitArrayStream

const getUsersFromApiAsStream = () => {
  // Holds a pagination token the API expects.
  let nextPageToken

  return new Readable({
    objectMode: true,
    read: async function() {
      if (nextPageToken) {
        requestOptions.pageToken = nextPageToken
      }

      const response = await request(requestOptions)
      // response = {
      //   "users": [
      //     "callmehiphop",
      //     "stephenplusplus"
      //   ],
      //   "nextPageToken": "--key-used-for-pagination--"
      // }

      // This pushes the array as a data event that `split-array-stream`
      // receives.
      stream.push(response.users)

      nextPageToken = response.nextPageToken

      if (!nextPageToken) {
        // The readable stream is over. We have all of the results from the API.
        //
        // To end the stream, push `null`.
        this.push(null)
      }
    },
  })
}

getUsersFromApiAsStream()
  .pipe(new SplitArrayStream())
  .on('data', function (user) {
    // First event:
    //   user = "callmehiphop"
    //
    // Second event:
    //   user = "stephenplusplus"
  })
  .on('end', function () {
    // All items from the array have been received
  })
````


### split([getArrayFn])

#### getArrayFn

- Type: `Array` | `Function`
- Optional

If left undefined, split-array-stream expects to receive events as part of a pipeline, as shown in the first example above.

If an array, each item will be emitted as `data` events to the next stream in the pipeline.

If a function, it is expected to return a Promise that resolves with an array. This function will be called each time the destination stream is ready to accept more data. **If there are no more arrays to give us, send `null`.** You may also add a `null` item into any array to signal the end of the stream.
