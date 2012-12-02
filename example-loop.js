#!/usr/bin/env node

var Dissolve = require("./index");

var parser = Dissolve().loop(function(end) {
  var i = 0;
  this.uint8("id").uint8("data_len").loop("data", function(end) {
    if (i++ >= this.vars.data_len) {
      return end(true);
    }

    this.uint8("a").uint8("b");
  }).tap(function() {
    this.emit("data", this.vars);
    this.vars = Object.create(null);
  });
});

parser.on("data", function(e) {
  console.log(e);
});

parser.write(new Buffer([0x01, 0x03, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
