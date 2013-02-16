var Dissolve = require("../index");

describe("tap", function() {
  it("should emit data 2 times then end", function(done) {
    var reader = Dissolve().uint8("x").tap(function() {
      this.emit("data", this.vars.x);

      this.uint8("y").tap(function() {
        this.emit("data", this.vars.y);

        this.tap(function() {
          this.emit("done");
        });
      });
    });

    var counter = 0;

    reader.on("data", function() {
      counter++;
    });

    reader.on("done", function() {
      if (counter !== 2) {
        return done(Error("invalid counter value"));
      } else {
        return done();
      }
    });

    reader.write(Buffer([0x01, 0x01]));
  });
});
