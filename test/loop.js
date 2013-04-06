var Dissolve = require("../index");

describe("loop", function() {
  it("should emit data 3 times then end", function(done) {
    var reader = Dissolve().loop(function(end) {
      this.uint8("x").tap(function() {
        if (this.vars.x === 0) {
          return end(true);
        } else {
          this.push(this.vars);
        }
      });
    });

    var counter = 0;

    reader.on("readable", function() {
      var e;
      while (e = reader.read()) {
        counter++;
      }
    });

    reader.on("end", function() {
      if (counter !== 3) {
        return done(Error("invalid counter value"));
      } else {
        return done();
      }
    });

    reader.write(Buffer([0x01, 0x01, 0x01, 0x00, 0x02]));
  });

  it("should populate an array correctly", function(done) {
    var reader = Dissolve().loop("things", function(end) {
      this.uint8("x").tap(function() {
        if (this.vars.x === 0) {
          return end(true);
        }
      });
    }).tap(function() {
      this.push(this.vars);
    });

    reader.on("readable", function() {
      var e;
      while (e = reader.read()) {
        if (typeof e !== "object" || e === null) {
          return done(Error("invalid payload for data event"));
        }

        if (!Array.isArray(e.things)) {
          return done(Error("array property not set or not correct type"));
        }

        if (e.things.length !== 3) {
          return done(Error("invalid number of entries"));
        }

        return done();
      }
    });

    reader.write(Buffer([0x01, 0x01, 0x01, 0x00]));
  });
});
