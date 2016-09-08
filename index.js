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

  this.jobs = [];
  this.vars = Object.create(null);
  this.vars_list = [];

  this._buffer = new BufferList();
  this._buffers_stack = [];
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

Dissolve.prototype._exec_parse = function _exec_parse(job, curr_offset) {
  this.jobs.shift();

  var jobs = this.jobs;
  this.jobs = [];

  this.jobs.push({type: "store", offset: curr_offset, new_buffer: job.buffer});

  if (job.name) {
    this.jobs.push({type: "down", into: job.name});
    this.jobs.push({type: "tap", args: job.args || [], fn: job.fn});
    this.jobs.push({type: "up"});
  } else {
    job.fn.apply(this, job.args || []);
  }

  this.jobs.push({type: "retrieve"});

  Array.prototype.push.apply(this.jobs, jobs);
};

Dissolve.prototype._exec_store_buffer = function (job, offset) {
  this.jobs.shift();

  var tmp = this._buffer;
  this._buffers_stack.push({
    buffer: this._buffer,
    offset: offset
  });
  this._buffer = job.new_buffer;

  return 0;
}

Dissolve.prototype._exec_pop_buffer = function (job, offset) {

  this.jobs.shift();

  // check for buffer overrun
  if (offset < this._buffer.length)
      throw new Error("Static buffer parsing - not all data consumed");

  delete(this._buffer);

  //({this._buffer, offset} = this._buffers_stack.pop());
  var obj = this._buffers_stack.pop();
  this._buffer = obj.buffer;

  return obj.offset;
}

Dissolve.prototype._exec_rest_buffer = function(job, offset) {
  this.jobs.shift();

  if (this._buffer instanceof Buffer)
    this.vars[job.name] = this._buffer.slice(offset, this._buffer.length - job.skip_end);
  else
    throw new Error("Rest of a non-static buffer requested");

  return this._buffer.length - job.skip_end;
}

Dissolve.prototype._exec_string = function _exec_string(job, offset, length) {
  this.vars[job.name] = this._buffer.toString("utf8", offset, offset + length);
  this.jobs.shift();
};

Dissolve.prototype._exec_buffer = function _exec_buffer(job, offset, length) {
  this.vars[job.name] = this._buffer.slice(offset, offset+length);
  this.jobs.shift();
};

Dissolve.prototype._transform = function _transform(input, encoding, done) {
  var offset = 0;

  this._buffer.append(input);

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

    if (job.type === "store") {
      offset = this._exec_store_buffer(job, offset);
      continue;
    }

    if (job.type === "retrieve") {
      offset = this._exec_pop_buffer(job, offset);
      continue;
    }

    if (job.type === "rest") {
      offset = this._exec_rest_buffer(job, offset);
      continue;
    }

    if (job.type === "parse") {
      this._exec_parse(job);
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
      offset += length;
      continue;
    }

    if (job.type === "string") {
      this._exec_string(job, offset, length);
      offset += length;
      continue;
    }

    if (job.type === "skip") {
      this.jobs.shift();
      offset += length;
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

    offset += length;
  }

  //parsing static buffer of exact length should never reach consume (after job retrieval loop)
  if (this._buffer instanceof Buffer)
      throw new Error("Static buffer parsing underrun, processing procedure went on to parse upper level buffer");

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

Dissolve.prototype["parse"] = function(buffer, name, fn) {
  if (typeof name === "function") {
    fn = name;
    name = null;
  }

  this.jobs.push({
    type: "parse",
    name: name,
    fn: fn,
    buffer: buffer
  });

  return this;
};

Dissolve.prototype["rest"] = function(name, skip_end) {

  if (!skip_end) skip_end = 0;

  this.jobs.push({
    type: "rest",
    name: name,
    skip_end: skip_end
  });

  return this;
}