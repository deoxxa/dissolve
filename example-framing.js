#!/usr/bin/env node

/*
 * this example demonstrates TCP framing by copying entire frame into a static buffer
 * and parsing of data segments inside, including cases when offset/length are not easy to calculate
 */

var Dissolve = require("./index"),
    util = require("util");

function Parser() {
  Dissolve.call(this);

  this.loop(function () {
    this.magicNumber('uint16be', 0x9005, 'header')
      .uint16be('packet_length')
      .loop(function (endPacket_cb) {
        this.buffer('packet_data', 'packet_length').tap(function () {
          var packet = this.vars.packet_data;

          this.deleteVar('packet_length');
          this.deleteVar('packet_data');

          this.parse(packet, function () {
            this.loop(function (lastSegment_cb) {
              this.uint8('segment_type').tap(function () {
                var segment_type;
                switch (segment_type = this.vars.segment_type) {

                  case 0x01: //error status segment
                    this
                      .uint8('ErrorCode')
                      .nonterminatedString('message');
                    lastSegment_cb();
                    break;

                  case 0x10: //successful execution segment, includes id, hex_id and text
                    this
                      .uint8('id')
                      .hexString(2, 'hex_id')
                      .terminatedString('text', 'ascii');
                    lastSegment_cb();
                    break;

                  case 0x00: //control segment
                    this.tap('EventInfo', function () {
                      this
                        .uint8('Event')
                        .hexString(5, 'NextBlock');
                    });
                    break;

                  default:
                    throw new Error("Encountered unknown segment type: 0x" + segment_type.toString(16));
                }
                this.deleteVar('segment_type');
              });
            });
          });
        }).tap(function packet_end() {
          endPacket_cb();
        });
      })
      .tap(function () {
        this.push(this.vars);
        this.vars = {};
      });
  });
};



util.inherits(Parser, Dissolve);

Parser.prototype.magicNumber = function magic(type, expected_value, ref_name) {
  var fn = this[type];
  var name = 'magic_'+expected_value.toString(16);
  fn.call(this, name)
    .tap(function() {
      if (this.vars[name] !== expected_value)
        throw new Error("Magic value '"+ref_name+"' not matched!");

      this.deleteVar(name);
    });

  return this;
};

Parser.prototype.hexString = function(length, name) {

  this.buffer(name, length).tap(function() {
    var string = this.vars[name];

    if (!(typeof(string) !== "string" || Buffer.isBuffer(string)))
      throw new Error("String expected");

    this.vars[name] = string.toString('hex').toUpperCase();
  });

  return this;
};

Parser.prototype.terminatedString = function (name, encoding) {
  this.rest(name, 1)
    .tap(function() {
      this.vars[name] = this.vars[name].toString(encoding);
    })
    .magicNumber('uint8', 0x01, name+' reply EOM');

  return this;
};

Parser.prototype.nonterminatedString = function (name, encoding) {
  this.rest(name)
    .tap(function() {
      this.vars[name] = this.vars[name].toString(encoding);
    });

  return this;
};

Parser.prototype.deleteVar = function(name) {
  delete(this.vars[name]);
};

var parser = new Parser();

parser.on("readable", function() {
  var e;
  while (e = parser.read()) {
    console.log(JSON.stringify(e, null, 2));
  }
});

parser.write(new Buffer([
  0x90, 0x05, 0, 16, //header

  0x00, 0x02, 0x00, 0xca, 0xfe, 0xba, 0xbe, //control
  0x10, 0xaa, 0xba, 0xad, 0x74, 0x65, 0x73, 0x74, 0x01 //successful execution
]));

parser.write(new Buffer([
  0x90, 0x05, 0, 15, //header

  0x00, 0x02, 0x00, 0xba, 0xad, 0xf0, 0x0d, //control
  0x01, 0xff, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x21 //error
]));