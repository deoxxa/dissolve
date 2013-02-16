var Dissolve = require("../index");

describe("tap", function() {
  it("should emit data 2 times then end", function(done) {
    var parser = Dissolve().uint8("x").tap(function() {
      this.emit("data", this.vars.x);

      this.uint8("y").tap(function() {
        this.emit("data", this.vars.y);

        this.tap(function() {
          this.emit("done");
        });
      });
    });

    var counter = 0;

    parser.on("data", function() {
      counter++;
    });

    parser.on("done", function() {
      if (counter !== 2) {
        return done(Error("invalid counter value"));
      } else {
        return done();
      }
    });

    parser.write(Buffer([0x01, 0x01]));
  });
});
