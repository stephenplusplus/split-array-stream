'use strict';

var async = require('async');
var eos = require('end-of-stream');

module.exports = function (array, stream, callback) {
  var arr = [].slice.call(array);

  var ended = false;

  eos(stream, function() {
    ended = true;
  });

  async.whilst(
    function () {
      return !ended && arr.length > 0;
    },

    function (next) {
      stream.push(arr.shift());
      setImmediate(next);
    },

    function () {
      callback(ended);
    });
};
