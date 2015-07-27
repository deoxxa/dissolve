#!/usr/bin/env node

var Dissolve = require("./index");

var parser = Dissolve()
parser.parser = function*() {
  var data_count;
  var data, elements, i, j;

  while (true) {
    data = [];
    data_count = yield this.uint8();

    for (i = 0; i < data_count; i++) {
      elements = []
      element_count = yield this.uint8();

      for (j = 0; j < element_count; j++) {
        elements.push({ element: yield this.uint8() });
      }

      data.push({ elements: elements });
    }

    this.push({
      data: data
    });
  }
};

parser.on("readable", function() {
  var e;
  while (e = parser.read()) {
    console.log(JSON.stringify(e, null, 2));
  }
});

parser.write(new Buffer([
  0x02,
    0x02,
      0x01, 0x02,
    0x02,
      0x03, 0x04,
]));
