#!/usr/bin/env node

var Dissolve = require("./index"),
    util = require("util");

function Parser() {
  Dissolve.call(this);

  this.loop(function(end) {
    this.uint8("pid").tap(function() {
      switch (this.vars.pid) {
        case 0x00: this.packet_0x00(); break;
        case 0x01: this.packet_0x01(); break;
        case 0x02: this.packet_0x02(); break;
        case 0x03: this.packet_0x03(); break;
        case 0x04: this.packet_0x04(); break;
        case 0xfe: break;
      }
    }).tap(function() {
      this.emit("data", this.vars);
      this.vars = {};
    });
  });
}
util.inherits(Parser, Dissolve);

Parser.prototype.mcstring16 = function string16(name) {
  var len = [name, "len"].join("_");

  return this.uint16be(len).tap(function() {
    this.buffer(name, this.vars[len] * 2).tap(function() {
      delete this.vars[len];

      for (var i=0;i<this.vars[name].length/2;++i) {
        var t = this.vars[name][i*2];
        this.vars[name][i*2] = this.vars[name][i*2+1];
        this.vars[name][i*2+1] = t;
      }

      this.vars[name] = this.vars[name].toString("ucs2");
    });
  });
};

Parser.prototype.packet_0x00 = function packet_0x00() {
  return this.uint32be("token");
};

Parser.prototype.packet_0x01 = function packet_0x01() {
  return this.uint32be("eid").mcstring16("level_type").uint8("game_mode").uint8("dimension").uint8("difficulty").uint8("junk").uint8("max_players");
};

Parser.prototype.packet_0x02 = function packet_0x02() {
  return this.uint8("protocol_version").mcstring16("username").mcstring16("server_host").uint32be("server_port");
};

Parser.prototype.packet_0x03 = function packet_0x03() {
  return this.mcstring16("message");
};

Parser.prototype.packet_0x04 = function packet_0x04() {
  return this.uint64be("time");
};

var parser = new Parser();

parser.on("data", function(e) {
  console.log(e);
});

parser.write(new Buffer([0x00, 0x00, 0x00, 0x00, 0x01]));
parser.write(new Buffer([0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x61, 0x00, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00]));
parser.write(new Buffer([0x02, 0x01, 0x00, 0x02, 0x00, 0x61, 0x00, 0x62, 0x00, 0x02, 0x00, 0x63, 0x00, 0x64, 0x00, 0x00, 0x00, 0x05]));
parser.write(new Buffer([0x03, 0x00, 0x02, 0x00, 0x65, 0x00, 0x66]));
parser.write(new Buffer([0x04, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01]));
