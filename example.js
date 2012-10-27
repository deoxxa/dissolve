#!/usr/bin/env node

var Dissolve = require("./index");

var parser = Dissolve().loop(function(end) {
  this.uint8("id").tap(function() {
    if (this.vars.id === 0x01) {
      this.uint16be("a").uint16be("b");
    } else if (this.vars.id === 0x02) {
      this.uint32be("x").uint32be("y");
    }
  }).tap(function() {
    this.emit("data", this.vars);
    this.vars = {};
  });
});

parser.on("data", function(e) {
  console.log(e);
});

parser.write(new Buffer([0x01, 0x00, 0x02, 0x00, 0x03])); // {id: 1, a: 2, b: 3}
parser.write(new Buffer([0x02, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x05])); // {id: 2, x: 4, y: 5}
parser.write(new Buffer([0x01]));
parser.write(new Buffer([0x00, 0x02, 0x00]));
parser.write(new Buffer([0x03])); // {id: 1, a: 2, b: 3}
