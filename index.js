"use strict";

var BufferList = require("bl");
var stream = require("readable-stream");
var util = require("util");

function Dissolve(options) {
  if (!(this instanceof Dissolve)) { return new Dissolve(options); }

  options = options || {};

  if (options.objectMode === undefined) {
    options.objectMode = true;
  }

  stream.Transform.call(this, options);

  this._buffer = new BufferList();
}

module.exports = Dissolve;
util.inherits(Dissolve, stream.Transform);

Dissolve.prototype.parser = function parser() {
  throw new Error("Not implemented");
};

Dissolve.prototype._transform = function _transform(input, encoding, done) {
  var offset = 0;

  this._buffer.append(input);

  if (!this._generator) {
    this._generator = this.parser();
    this.currentStep = this._generator.next();
  }

  while (!this.currentStep.done) {
    var job = this.currentStep.value;
    var result, length = job.length;

    if (this._buffer.length - offset < length) {
      break;
    }

    switch (job.type) {
      case "skip": { break; }
      case "string": { result = this._buffer.toString("utf8", offset, offset + length); break; }
      case "buffer": { result = this._buffer.slice(offset, offset + length); break; }
      case "int8le":  { result = this._buffer.readInt8(offset);  break; }
      case "uint8le": { result = this._buffer.readUInt8(offset); break; }
      case "int8be":  { result = this._buffer.readInt8(offset);  break; }
      case "uint8be": { result = this._buffer.readUInt8(offset); break; }
      case "int16le":  { result = this._buffer.readInt16LE(offset);  break; }
      case "uint16le": { result = this._buffer.readUInt16LE(offset); break; }
      case "int16be":  { result = this._buffer.readInt16BE(offset);  break; }
      case "uint16be": { result = this._buffer.readUInt16BE(offset); break; }
      case "int32le":  { result = this._buffer.readInt32LE(offset);  break; }
      case "uint32le": { result = this._buffer.readUInt32LE(offset); break; }
      case "int32be":  { result = this._buffer.readInt32BE(offset);  break; }
      case "uint32be": { result = this._buffer.readUInt32BE(offset); break; }
      case "int64le":  { result = (Math.pow(2, 32) * this._buffer.readInt32LE(offset + 4)) + ((this._buffer[offset + 4] & 0x80 === 0x80 ? 1 : -1) * this._buffer.readUInt32LE(offset)); break; }
      case "uint64le": { result = (Math.pow(2, 32) * this._buffer.readUInt32LE(offset + 4)) + this._buffer.readUInt32LE(offset); break; }
      case "int64be":  { result = (Math.pow(2, 32) * this._buffer.readInt32BE(offset)) + ((this._buffer[offset] & 0x80 === 0x80 ? 1 : -1) * this._buffer.readUInt32BE(offset + 4)); break; }
      case "uint64be": { result = (Math.pow(2, 32) * this._buffer.readUInt32BE(offset)) + this._buffer.readUInt32BE(offset + 4); break; }
      case "floatle":  { result = this._buffer.readFloatLE(offset);  break; }
      case "floatbe":  { result = this._buffer.readFloatBE(offset);  break; }
      case "doublele": { result = this._buffer.readDoubleLE(offset); break; }
      case "doublebe": { result = this._buffer.readDoubleBE(offset); break; }
      default: { return done(new Error("invalid job type")); }
    }

    offset += length;

    this.currentStep = this._generator.next(result);
  }

  this._buffer.consume(offset);

  if (this.currentStep.done) {
    this.push(null);
  }

  return done();
};

Dissolve.prototype.buffer = function buffer(length) {
  return {
    type: "buffer",
    length: length
  };
};

Dissolve.prototype.string = function string(length, encoding) {
  return {
    type: "string",
    length: length,
    encoding: encoding
  };
};

Dissolve.prototype.skip = function skip(length) {
  return { type: "skip" };
};

[["float", 4], ["double", 8]].forEach(function(t) {
  ["", "le", "be"].forEach(function(e) {
    var id = [t[0], e].join(""),
        type = [t[0], e || "le"].join(""),
        length = t[1];

    Dissolve.prototype[id] = function () {
      return {
        type: type,
        length: length
      };
    };
  });
});

[8, 16, 32, 64].forEach(function(b) {
  ["", "u"].forEach(function(s) {
    ["", "le", "be"].forEach(function(e) {
      var id = [s, "int", b, e].join(""),
          type = [s, "int", b, e || "le"].join(""),
          length = b / 8;

      Dissolve.prototype[id] = function () {
        return {
          type: type,
          length: length
        };
      };
    });
  });
});
