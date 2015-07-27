#!/usr/bin/env node
"use strict";

var Dissolve = require("./index"),
    util = require("util");

class Parser extends Dissolve {
  *parser() {
    var data;
    while (true) {
      data = {
        pid: yield this.uint8()
      };

      switch (data.pid) {
        case 0x00:
          data.token = yield this.uint32be();
        break;

        case 0x01:
          data.eid = yield this.uint32be();
          data.level_type = yield *this.mcstring16();
          data.game_mode = yield this.uint8();
          data.dimension = yield this.uint8();
          data.difficulty = yield this.uint8();
          data.junk = yield this.uint8();
          data.max_players = yield this.uint8();
        break;

        case 0x02:
          data.protocol_version = yield this.uint8();
          data.username = yield *this.mcstring16();
          data.server_host = yield *this.mcstring16();
          data.server_port = yield this.uint32be();
        break;

        case 0x03:
          data.message = yield *this.mcstring16();
        break;

        case 0x04:
          data.time = yield this.uint64be();
        break;

        case 0xfe:
        break;
      }

      this.push(data);
    }
  }

  *mcstring16() {
    var length = yield this.uint16be();

    var data = yield this.buffer(length * 2);

    for (var i = 0; i < (data.length / 2); ++i) {
      var t = data[i*2];
      data[i*2] = data[i*2+1];
      data[i*2+1] = t;
    }

    return data;
  }
}

var parser = new Parser();

parser.on("readable", function() {
  var e;
  while (e = parser.read()) {
    //console.log(e);
  }
});

for (var i = 0; i < 50000; i++) {
  parser.write(new Buffer([0x00, 0x00, 0x00, 0x00, 0x01]));
  parser.write(new Buffer([0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x61, 0x00, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00]));
  parser.write(new Buffer([0x02, 0x01, 0x00, 0x02, 0x00, 0x61, 0x00, 0x62, 0x00, 0x02, 0x00, 0x63, 0x00, 0x64, 0x00, 0x00, 0x00, 0x05]));
  parser.write(new Buffer([0x03, 0x00, 0x02, 0x00, 0x65, 0x00, 0x66]));
  parser.write(new Buffer([0x04, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01]));
}
