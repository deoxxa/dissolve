var Dissolve = require("../index");

describe("Dissolve looping", function() {
  it("should support simple looping constructs", function(done) {
    var reader = Dissolve();
    reader.parser = function*() {
      var x;
      while ((x = yield this.uint8()) !== 0) {
        this.push({ x: x });
      }
    };

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

  it("should work with complex, nested loop operations", function(done) {
    var reader = Dissolve();
    reader.parser = function*() {
      var data = [];
      var data_count = yield this.uint8();

      for (var i = 0; i < data_count; i++) {
        var elements = []
        var element_count = yield this.uint8();

        for (var j = 0; j < element_count; j++) {
          elements.push({ element: yield this.uint8() });
        }

        data.push({ elements: elements });
      }

      this.push({
        data: data
      });
    };

    reader.on("readable", function() {
      var e;
      while (e = reader.read()) {
        if (typeof e !== "object" || e === null) {
          return done(Error("invalid payload for data event"));
        }

        if (!Array.isArray(e.data)) {
          return done(Error("array property not set or not correct type"));
        }

        if (e.data.length !== 2) {
          return done(Error("invalid length for data"));
        }

        if (!Array.isArray(e.data[0].elements)) {
          return done(Error("data[0].elements not set or not correct type"));
        }

        if (e.data[0].elements.length !== 2) {
          return done(Error("invalid length for data[0].elements"));
        }

        if (e.data[0].elements[0].element !== 1) {
          return done(Error("invalid value for data[0].elements[0].element"));
        }

        if (e.data[0].elements[1].element !== 2) {
          return done(Error("invalid value for data[0].elements[1].element"));
        }

        if (!Array.isArray(e.data[1].elements)) {
          return done(Error("data[1].elements not set or not correct type"));
        }

        if (e.data[1].elements.length !== 2) {
          return done(Error("invalid length for data[1].elements"));
        }

        if (e.data[1].elements[0].element !== 3) {
          return done(Error("invalid value for data[1].elements[0].element"));
        }

        if (e.data[1].elements[1].element !== 4) {
          return done(Error("invalid value for data[1].elements[1].element"));
        }

        return done();
      }
    });

    reader.write(new Buffer([
      0x02,
        0x02,
          0x01, 0x02,
        0x02,
          0x03, 0x04,
    ]));
  });
});
