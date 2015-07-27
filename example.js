#!/usr/bin/env node

var Dissolve = require("./index");

var parser = new Dissolve();
parser.parser = function*() {
  var id, payload;

  while (true) {
    id = yield this.uint8();

    if (id === 0x01) {
      payload = {
        "a": yield this.uint16be(),
        "b": yield this.uint16be()
      };
    } else if (id === 0x02) {
      payload = {
        "x": yield this.uint32be(),
        "y": yield this.uint32be()
      };
    } else if (id === 0x03) {
      payload = {
        "l": yield this.floatbe(),
        "m": yield this.doublebe()
      };
    }

    this.push({
      id: id,
      payload: {
        asdf: payload
      }
    });
  }
};

parser.on("readable", function() {
  var e;
  while (e = parser.read()) {
    console.log(e);
  }
});

parser.write(new Buffer([0x01, 0x00, 0x02, 0x00, 0x03])); // {id: 1, a: 2, b: 3}
parser.write(new Buffer([0x02, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x05])); // {id: 2, x: 4, y: 5}
parser.write(new Buffer([0x01]));
parser.write(new Buffer([0x00, 0x02, 0x00]));
parser.write(new Buffer([0x03])); // {id: 1, a: 2, b: 3}
parser.write(new Buffer([0x03, 0x40, 0x06, 0x66, 0x66, 0x40, 0x00, 0xcc, 0xcc, 0xcc, 0xcc, 0xcc, 0xcd])); // {id: 3, l: ~2.1, m: ~2.1}
