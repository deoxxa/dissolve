var assert = require("chai").assert;
var Dissolve = require("../index");

describe("tap", function() {
  it("should emit data 2 times then end", function(done) {
    var reader = Dissolve().uint8("x").tap(function() {
      this.push(this.vars.x);

      this.uint8("y").tap(function() {
        this.push(this.vars.y);

        this.tap(function() {
          this.push(null);
        });
      });
    });

    var counter = 0;

    reader.on("readable", function() {
      var data;
      while (data = reader.read()) {
        counter++;
      }
    });

    reader.on("end", function() {
      if (counter !== 2) {
        return done(Error("invalid counter value"));
      } else {
        return done();
      }
    });

    reader.write(Buffer([0x01, 0x01]));
  });

  it("should populate child objects correctly", function(done) {
    var reader = Dissolve().tap("a", function() {
      this.uint8("x").tap("b", function() {
        this.uint8("y").tap(function() {
          this.push(this.vars);
        });
      });
    });

    reader.once("readable", function() {
      var e = reader.read();

      assert.isObject(e);
      assert.isObject(e.a);
      assert.isObject(e.a.b);
      assert.strictEqual(e.a.x, 1);
      assert.strictEqual(e.a.b.y, 1);

      assert.isNull(reader.read());

      done();
    });

    reader.write(Buffer([0x01, 0x01]));
  });
});
