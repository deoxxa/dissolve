#!/usr/bin/env node

var Parser = require("./index");

var parser = Parser().uint8("length").string("data", "length").tap(function() {
  this.emit("data", this.vars);
});

parser.on("data", function(e) {
  console.log(e);
});

parser.write(new Buffer([6]));
parser.write(new Buffer("abcde"));
parser.write(new Buffer("f"));
