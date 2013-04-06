#!/usr/bin/env node

var Dissolve = require("./index");

var parser = Dissolve().loop(function(end) {
  this.uint8("id").loop("data", function(end) {
    this.uint8("type").tap(function() {
      if (this.vars.type === 0) {
        return end(true);
      }

      this.uint8("x").uint8("y");
    });
  }).tap(function() {
    this.push(this.vars);
    this.vars = Object.create(null);
  });
});

parser.on("readable", function() {
  var e;
  while (e = parser.read()) {
    console.log(e);
  }
});

parser.write(new Buffer([0x01, 0x01, 0x11, 0x12, 0x01, 0x21, 0x22, 0x01, 0x31, 0x32, 0x00]));
