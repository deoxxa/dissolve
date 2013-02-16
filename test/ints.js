var Dissolve = require("../index");

describe("Integers", function() {
  [
    ["uint8 0x00", "uint8", Buffer([0x00]), 0],
    ["uint8 0x01", "uint8", Buffer([0x01]), 1],
    ["uint8 0x7f", "uint8", Buffer([0x7f]), 127],
    ["uint8 0xff", "uint8", Buffer([0xff]), 255],
    ["int8 0x00",  "int8",  Buffer([0x00]), 0],
    ["int8 0x01",  "int8",  Buffer([0x01]), 1],
    ["int8 0x7f",  "int8",  Buffer([0x7f]), 127],
    ["int8 0xff",  "int8",  Buffer([0xff]), -1],
  ].forEach(function(e) {
    describe(e[0], function() {
      var parser = new Dissolve();

      parser[e[1]]("i").tap(function() {
        this.emit("data", this.vars.i);
      });

      it("should return the correct result", function(done) {
        parser.on("data", function(data) {
          if (data !== e[3]) {
            return done(Error("expected " + JSON.stringify(e[3]) + " but got " + JSON.stringify(data)));
          } else {
            return done();
          }
        });

        parser.write(e[2]);
      });
    });
  });
});
