var BufferList = require("bl"),
    stream = require("readable-stream");

var Dissolve = module.exports = function Dissolve(options) {
  if (!(this instanceof Dissolve)) { return new Dissolve(options); }

  if (!options) {
    options = {};
  }

  if (!options.hasOwnProperty('objectMode')) {
    options.objectMode = true;
  }

  stream.Transform.call(this, options);

  this.offset = 0;
  this.jobs = [];
  this.vars = Object.create(null);
  this.vars_list = [];

  this._buffer = new BufferList();
};
Dissolve.prototype = Object.create(stream.Transform.prototype, {constructor: {value: Dissolve}});

Dissolve.prototype._job_down = function _job_down(job) {
  var tmp = this.vars;
  this.vars_list.push(tmp);
  this.vars = tmp[job.into] = Object.create(tmp);
};

Dissolve.prototype._job_up = function _job_up() {
  this.vars.__proto__ = null;
  this.vars = this.vars_list.pop();
};

Dissolve.prototype._exec_down = function _exec_down(job) {
  this.jobs.shift();
  this._job_down(job);
};

Dissolve.prototype._exec_up = function _exec_up(job) {
  this.jobs.shift();
  this._job_up();
};

Dissolve.prototype._exec_tap = function _exec_tap(job) {
  this.jobs.shift();

  var jobs = this.jobs;

  this.jobs = [];

  if (job.name) {
    this.jobs.push({type: "down", into: job.name});
    this.jobs.push({type: "tap", args: job.args, fn: job.fn});
    this.jobs.push({type: "up"});
  } else {
    job.fn.apply(this, job.args || []);
  }

  Array.prototype.push.apply(this.jobs, jobs);
};

Dissolve.prototype._exec_loop = function _exec_loop(job) {
  if (job.finished) {
    this.jobs.shift();
    return;
  }

  var jobs = this.jobs;
  this.jobs = [];

  if (job.name) {
    if (typeof this.vars[job.name] === "undefined") {
      this.vars[job.name] = [];
    }

    // private scope so _job doesn't get redefined later
    (function() {
      var _job = job;

      this.jobs.push({
        type: "tap",
        name: "__loop_temp",
        args: [job.finish],
        fn: job.fn,
      });

      this.jobs.push({
        type: "tap",
        fn: function() {
          if (!_job.cancelled) {
            this.vars[_job.name].push(this.vars.__loop_temp);
          }

          delete this.vars.__loop_temp;
        },
      });
    }).call(this);
  } else {
    this.jobs.push({
      type: "tap",
      args: [job.finish],
      fn: job.fn,
    });
  }
  Array.prototype.push.apply(this.jobs, jobs);
};

Dissolve.prototype._exec_string = function _exec_string(job, offset, length) {
  this.vars[job.name] = this._buffer.toString("utf8", offset, offset + length);
  this.jobs.shift();
};

Dissolve.prototype._exec_buffer = function _exec_buffer(job, offset, length) {
  this.vars[job.name] = this._buffer.slice(offset, offset+length);
  this.jobs.shift();
};

Dissolve.prototype._transform = function _transform(input, encoding, done) {
  var that = this;
  var offset = 0;

  this._buffer.append(input);

  function moveOffset(value) {
    offset += value;
    that.offset += value;
  }

  while (this.jobs.length) {
    var job = this.jobs[0];

    if (job.type === "down") {
      this._exec_down(job);
      continue;
    }

    if (job.type === "up") {
      this._exec_up(job);
      continue;
    }

    if (job.type === "tap") {
      this._exec_tap(job);
      continue;
    }

    if (job.type === "loop") {
      this._exec_loop(job);
      continue;
    }

    var length;
    if (typeof job.length === "string") {
      length = this.vars[job.length];
    } else {
      length = job.length;
    }

    if (this._buffer.length - offset < length) {
      break;
    }

    if (job.type === "buffer") {
      this._exec_buffer(job, offset, length);
      moveOffset(length);
      continue;
    }

    if (job.type === "string") {
      this._exec_string(job, offset, length);
      moveOffset(length);
      continue;
    }

    if (job.type === "skip") {
      this.jobs.shift();
      moveOffset(length);
      continue;
    }

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
      default: { return done(new Error("invalid job type")); }
    }

    this.jobs.shift();

    moveOffset(length);
  }

  this._buffer.consume(offset);

  if (this.jobs.length === 0) {
    this.push(null);
  }

  return done();
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

    var job = {
      type: e,
      name: name,
      fn: fn,
    };

    if (e === "loop") {
      job.finish = function(cancel) {
        job.finished = true;
        job.cancelled = !!cancel;
      };
    }

    this.jobs.push(job);

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

["skip"].forEach(function(e) {
  Dissolve.prototype[e] = function(length) {
    this.jobs.push({
      type: e,
      length: length,
    });

    return this;
  };
});
