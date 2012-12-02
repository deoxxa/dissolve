var Steez = require("steez"),
    util = require("util");

function copy(o) {
  return Object.keys(o).reduce(function(i, v) {
    i[v] = o[v];
    return i;
  }, {});
}

var Dissolve = module.exports = function Dissolve() {
  if (!(this instanceof Dissolve)) { return new Dissolve(); }

  Steez.call(this);

  this.jobs = [];
  this.vars = Object.create(null);
  this.vars_list = [];

  this._buffer = new Buffer(0);
};
util.inherits(Dissolve, Steez);

Dissolve.prototype.write = function write(data) {
  var offset = 0;

  var tmp = new Buffer(this._buffer.length + data.length);
  this._buffer.copy(tmp);
  data.copy(tmp, this._buffer.length);
  this._buffer = tmp;

  while (true && this.jobs.length) {
    var job = this.jobs[0];

    if (job.type === "down") {
      this.jobs.shift();

      var tmp = this.vars;
      this.vars_list.push(tmp);
      this.vars = tmp[job.into] = Object.create(tmp);

      continue;
    }

    if (job.type === "up") {
      this.jobs.shift();

      this.vars.__proto__ = null;
      this.vars = this.vars_list.pop();

      continue;
    }

    if (job.type === "tap") {
      this.jobs.shift();

      var jobs = this.jobs.slice();
      this.jobs.splice(0);
      if (job.name) {
        this.jobs.push({type: "down", into: job.name});
        job.fn.apply(this);
        this.jobs.push({type: "up"});
      } else {
        job.fn.apply(this);
      }
      Array.prototype.splice.apply(this.jobs, [this.jobs.length, 0].concat(jobs));

      continue;
    }

    if (job.type === "loop") {
      if (job.finished) {
        this.jobs.shift();
        continue;
      }

      var jobs = this.jobs.slice();
      this.jobs.splice(0);
      job.fn.apply(this, [function() { job.finished = true; }]);
      Array.prototype.splice.apply(this.jobs, [this.jobs.length, 0].concat(jobs));

      continue;
    }

    if (typeof job.length === "string") {
      job = copy(job);
      job.length = this.vars[job.length];
    }

    if (this._buffer.length - offset < job.length) {
      break;
    }

    if (job.type === "buffer") {
      this.vars[job.name] = new Buffer(job.length);
      this._buffer.copy(this.vars[job.name], 0, offset, offset + job.length);

      this.jobs.shift();

      offset += job.length;

      continue;
    }

    if (job.type === "string") {
      this.vars[job.name] = this._buffer.toString("utf8", offset, offset + job.length);

      this.jobs.shift();

      offset += job.length;

      continue;
    }

    if (job.type.match(/^((u?int(8|16|32|64))|float|double)(le|be)?$/)) {
      switch (job.type) {
        case "int8le":  { this.vars[job.name] = this._buffer.readInt8(offset);  break; }
        case "uint8le": { this.vars[job.name] = this._buffer.readUInt8(offset); break; }
        case "int8be":  { this.vars[job.name] = this._buffer.readInt8(offset);  break; }
        case "uint8be": { this.vars[job.name] = this._buffer.readUInt8(offset); break; }
        case "int16le":  { this.vars[job.name] = this._buffer.readInt16LE(offset);  break; }
        case "uint16le": { this.vars[job.name] = this._buffer.readUInt16LE(offset); break; }
        case "int16be":  { this.vars[job.name] = this._buffer.readInt16BE(offset);  break; }
        case "uint16be": { this.vars[job.name] = this._buffer.readUInt16BE(offset); break; }
        case "int32le":  { this.vars[job.name] = this._buffer.readInt32LE(offset);  break; }
        case "uint32le": { this.vars[job.name] = this._buffer.readUInt32LE(offset); break; }
        case "int32be":  { this.vars[job.name] = this._buffer.readInt32BE(offset);  break; }
        case "uint32be": { this.vars[job.name] = this._buffer.readUInt32BE(offset); break; }
        case "int64le":  { this.vars[job.name] = (Math.pow(2, 32) * this._buffer.readInt32LE(offset + 4)) + ((this._buffer[offset + 4] & 0x80 === 0x80 ? 1 : -1) * this._buffer.readUInt32LE(offset)); break; }
        case "uint64le": { this.vars[job.name] = (Math.pow(2, 32) * this._buffer.readUInt32LE(offset + 4)) + this._buffer.readUInt32LE(offset); break; }
        case "int64be":  { this.vars[job.name] = (Math.pow(2, 32) * this._buffer.readInt32BE(offset)) + ((this._buffer[offset] & 0x80 === 0x80 ? 1 : -1) * this._buffer.readUInt32BE(offset + 4)); break; }
        case "uint64be": { this.vars[job.name] = (Math.pow(2, 32) * this._buffer.readUInt32BE(offset)) + this._buffer.readUInt32BE(offset + 4); break; }
        case "floatle":  { this.vars[job.name] = this._buffer.readFloatLE(offset);  break; }
        case "floatbe":  { this.vars[job.name] = this._buffer.readFloatBE(offset);  break; }
        case "doublele": { this.vars[job.name] = this._buffer.readDoubleLE(offset); break; }
        case "doublebe": { this.vars[job.name] = this._buffer.readDoubleBE(offset); break; }
      }

      this.jobs.shift();

      offset += job.length;

      continue;
    }

    throw new Error("uhhhhh");
  }

  this._buffer = this._buffer.slice(offset);

  if (this.jobs.length === 0) {
    this.end();
  }

  return !this.paused && this.writable;
};

[["float", 4], ["double", 8]].forEach(function(t) {
  ["", "le", "be"].forEach(function(e) {
    var id = [t[0], e].join(""),
        type = [t[0], e || "le"].join(""),
        length = t[1];

    Dissolve.prototype[id] = function(name) {
      this.jobs.push({
        type: type,
        length: length,
        name: name,
      });

      return this;
    };
  });
});

[8, 16, 32, 64].forEach(function(b) {
  ["", "u"].forEach(function(s) {
    ["", "le", "be"].forEach(function(e) {
      var id = [s, "int", b, e].join(""),
          type = [s, "int", b, e || "le"].join(""),
          length = b / 8;

      Dissolve.prototype[id] = function(name) {
        this.jobs.push({
          type: type,
          length: length,
          name: name,
        });

        return this;
      };
    });
  });
});

["tap", "loop"].forEach(function(e) {
  Dissolve.prototype[e] = function(name, fn) {
    if (typeof name === "function") {
      fn = name;
      name = null;
    }

    this.jobs.push({
      type: e,
      name: name,
      fn: fn,
    });

    return this;
  };
});

["buffer", "string"].forEach(function(e) {
  Dissolve.prototype[e] = function(name, length) {
    this.jobs.push({
      type: e,
      name: name,
      length: length,
    });

    return this;
  };
});
