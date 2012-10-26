#!/usr/bin/env node

var Parser = require("./index");

var parser = Parser().loop(function(end) {
  this.uint8("pid").tap(function() {
    switch (this.vars.pid) {
      case 0x00: this.uint32be("eid"); break;
      case 0x01: this.uint16be("a").uint16be("b").uint16be("c"); break;
      case 0x02: this.uint16be("dlen").buffer("d", "dlen"); break;
    }
  }).uint16be("csum").tap(function() {
    this.emit("data", this.vars);
    this.vars = {};
  });
});

parser.on("data", function(e) {
  console.log(e);
});

parser.write(new Buffer([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02]));
parser.write(new Buffer([0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x02]));
parser.write(new Buffer([0x02, 0x00, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x03]));
