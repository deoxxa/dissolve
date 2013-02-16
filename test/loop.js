var Dissolve = require("../index");

describe("Loop", function() {
  it("should emit data 3 times then end", function(done) {
    var reader = Dissolve().loop(function(end) {
      this.uint8("x").tap(function() {
        if (this.vars.x === 0) {
          return end(true);
        } else {
          this.emit("data", this.vars.x);
        }
      });
    }).tap(function() {
      this.emit("done");
    });

    var counter = 0;

    reader.on("data", function(e) {
      counter++;
    });

    reader.on("done", function() {
      if (counter !== 3) {
        return done(Error("invalid counter value"));
      } else {
        return done();
      }
    });

    reader.write(Buffer([0x01, 0x01, 0x01, 0x00, 0x02]));
  });
});
