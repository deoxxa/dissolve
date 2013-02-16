var Dissolve = require("../index");

describe("integers", function() {
  [
    // 8-bit
    ["uint8 0x00", "uint8", "00", 0],
    ["uint8 0x01", "uint8", "01", 1],
    ["uint8 0x7f", "uint8", "7f", 127],
    ["uint8 0xff", "uint8", "ff", 255],
    ["int8 0x00",  "int8",  "00", 0],
    ["int8 0x01",  "int8",  "01", 1],
    ["int8 0x7f",  "int8",  "7f", 127],
    ["int8 0xff",  "int8",  "ff", -1],
    // big-endian 16-bit
    ["uint16be 0x0000", "uint16be", "0000", 0],
    ["uint16be 0x0001", "uint16be", "0001", 1],
    ["uint16be 0x007f", "uint16be", "007f", 127],
    ["uint16be 0x00ff", "uint16be", "00ff", 255],
    ["int16be 0x0000",  "int16be",  "0000", 0],
    ["int16be 0x0001",  "int16be",  "0001", 1],
    ["int16be 0x007f",  "int16be",  "007f", 127],
    ["int16be 0x00ff",  "int16be",  "00ff", 255],
    ["uint16be 0x7f00", "uint16be", "7f00", 32512],
    ["uint16be 0x7f01", "uint16be", "7f01", 32513],
    ["uint16be 0x7f7f", "uint16be", "7f7f", 32639],
    ["uint16be 0x7fff", "uint16be", "7fff", 32767],
    ["int16be 0x7f00",  "int16be",  "7f00", 32512],
    ["int16be 0x7f01",  "int16be",  "7f01", 32513],
    ["int16be 0x7f7f",  "int16be",  "7f7f", 32639],
    ["int16be 0x7fff",  "int16be",  "7fff", 32767],
    ["uint16be 0xff00", "uint16be", "ff00", 65280],
    ["uint16be 0xff01", "uint16be", "ff01", 65281],
    ["uint16be 0xff7f", "uint16be", "ff7f", 65407],
    ["uint16be 0xffff", "uint16be", "ffff", 65535],
    ["int16be 0xff00",  "int16be",  "ff00", -256],
    ["int16be 0xff01",  "int16be",  "ff01", -255],
    ["int16be 0xff7f",  "int16be",  "ff7f", -129],
    ["int16be 0xffff",  "int16be",  "ffff", -1],
    // little-endian 16-bit
    ["uint16le 0x0000", "uint16le", "0000", 0],
    ["uint16le 0x0100", "uint16le", "0100", 1],
    ["uint16le 0x7f00", "uint16le", "7f00", 127],
    ["uint16le 0xff00", "uint16le", "ff00", 255],
    ["int16le 0x0000",  "int16le",  "0000", 0],
    ["int16le 0x0100",  "int16le",  "0100", 1],
    ["int16le 0x7f00",  "int16le",  "7f00", 127],
    ["int16le 0xff00",  "int16le",  "ff00", 255],
    ["uint16le 0x007f", "uint16le", "007f", 32512],
    ["uint16le 0x017f", "uint16le", "017f", 32513],
    ["uint16le 0x7f7f", "uint16le", "7f7f", 32639],
    ["uint16le 0xff7f", "uint16le", "ff7f", 32767],
    ["int16le 0x007f",  "int16le",  "007f", 32512],
    ["int16le 0x017f",  "int16le",  "017f", 32513],
    ["int16le 0x7f7f",  "int16le",  "7f7f", 32639],
    ["int16le 0xff7f",  "int16le",  "ff7f", 32767],
    ["uint16le 0x00ff", "uint16le", "00ff", 65280],
    ["uint16le 0x01ff", "uint16le", "01ff", 65281],
    ["uint16le 0x7fff", "uint16le", "7fff", 65407],
    ["uint16le 0xffff", "uint16le", "ffff", 65535],
    ["int16le 0x00ff",  "int16le",  "00ff", -256],
    ["int16le 0x01ff",  "int16le",  "01ff", -255],
    ["int16le 0x7fff",  "int16le",  "7fff", -129],
    ["int16le 0xffff",  "int16le",  "ffff", -1],
    // big-endian 32-bit
    ["uint32be 0x00000000", "uint32be", "00000000", 0],
    ["uint32be 0x00000001", "uint32be", "00000001", 1],
    ["uint32be 0x0000007f", "uint32be", "0000007f", 127],
    ["uint32be 0x000000ff", "uint32be", "000000ff", 255],
    ["int32be 0x00000000",  "int32be",  "00000000", 0],
    ["int32be 0x00000001",  "int32be",  "00000001", 1],
    ["int32be 0x0000007f",  "int32be",  "0000007f", 127],
    ["int32be 0x000000ff",  "int32be",  "000000ff", 255],
    ["uint32be 0x7f000000", "uint32be", "7f000000", 2130706432],
    ["uint32be 0x7f000001", "uint32be", "7f000001", 2130706433],
    ["uint32be 0x7f00007f", "uint32be", "7f00007f", 2130706559],
    ["uint32be 0x7f0000ff", "uint32be", "7f0000ff", 2130706687],
    ["int32be 0x7f000000",  "int32be",  "7f000000", 2130706432],
    ["int32be 0x7f000001",  "int32be",  "7f000001", 2130706433],
    ["int32be 0x7f00007f",  "int32be",  "7f00007f", 2130706559],
    ["int32be 0x7f0000ff",  "int32be",  "7f0000ff", 2130706687],
    ["uint32be 0xff000000", "uint32be", "ff000000", 4278190080],
    ["uint32be 0xff000001", "uint32be", "ff000001", 4278190081],
    ["uint32be 0xff00007f", "uint32be", "ff00007f", 4278190207],
    ["uint32be 0xff0000ff", "uint32be", "ff0000ff", 4278190335],
    ["int32be 0xffffff00",  "int32be",  "ffffff00", -256],
    ["int32be 0xffffff01",  "int32be",  "ffffff01", -255],
    ["int32be 0xffffff7f",  "int32be",  "ffffff7f", -129],
    ["int32be 0xffffffff",  "int32be",  "ffffffff", -1],
    // little-endian 32-bit
    ["uint32le 0x00000000", "uint32le", "00000000", 0],
    ["uint32le 0x01000000", "uint32le", "01000000", 1],
    ["uint32le 0x7f000000", "uint32le", "7f000000", 127],
    ["uint32le 0xff000000", "uint32le", "ff000000", 255],
    ["int32le 0x00000000",  "int32le",  "00000000", 0],
    ["int32le 0x01000000",  "int32le",  "01000000", 1],
    ["int32le 0x7f000000",  "int32le",  "7f000000", 127],
    ["int32le 0xff000000",  "int32le",  "ff000000", 255],
    ["uint32le 0x0000007f", "uint32le", "0000007f", 2130706432],
    ["uint32le 0x0100007f", "uint32le", "0100007f", 2130706433],
    ["uint32le 0x7f00007f", "uint32le", "7f00007f", 2130706559],
    ["uint32le 0xff00007f", "uint32le", "ff00007f", 2130706687],
    ["int32le 0x0000007f",  "int32le",  "0000007f", 2130706432],
    ["int32le 0x0100007f",  "int32le",  "0100007f", 2130706433],
    ["int32le 0x7f00007f",  "int32le",  "7f00007f", 2130706559],
    ["int32le 0xff00007f",  "int32le",  "ff00007f", 2130706687],
    ["uint32le 0x000000ff", "uint32le", "000000ff", 4278190080],
    ["uint32le 0x010000ff", "uint32le", "010000ff", 4278190081],
    ["uint32le 0x7f0000ff", "uint32le", "7f0000ff", 4278190207],
    ["uint32le 0xff0000ff", "uint32le", "ff0000ff", 4278190335],
    ["int32le 0x00ffffff",  "int32le",  "00ffffff", -256],
    ["int32le 0x01ffffff",  "int32le",  "01ffffff", -255],
    ["int32le 0x7fffffff",  "int32le",  "7fffffff", -129],
    ["int32le 0xffffffff",  "int32le",  "ffffffff", -1],
  ].forEach(function(e) {
    describe(e[0], function() {
      it("should return " + e[3], function(done) {
        var reader = Dissolve()[e[1]]("i").tap(function() {
          this.emit("data", this.vars.i);
        });

        reader.on("data", function(data) {
          if (data !== e[3]) {
            return done(Error("expected " + JSON.stringify(e[3]) + " but got " + JSON.stringify(data)));
          } else {
            return done();
          }
        });

        reader.write(Buffer(e[2], "hex"));
      });
    });
  });
});
