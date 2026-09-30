const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/statisticsRing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { getRingSegment } = exportsObject;
const counts = [8, 3, 5, 4];
for (const size of [220, 300]) {
  let start = 0;
  counts.forEach((count, index) => {
    const angle = (start + count / 2) / 20 * Math.PI * 2 - Math.PI / 2;
    for (const radius of [110, 132, 126 * 1.04 + 8]) {
      assert.equal(getRingSegment((150 + radius * Math.cos(angle)) * size / 300,
        (150 + radius * Math.sin(angle)) * size / 300, size, counts), index);
    }
    start += count;
  });
}
assert.equal(getRingSegment(150, 150, 300, counts), null);
assert.equal(getRingSegment(0, 0, 300, counts), null);
assert.equal(getRingSegment(260, 150, 300, [0, 0, 0, 0]), null);
assert.equal(getRingSegment(260, 150, 300, [0, 1, 0, 0]), 1);
assert.equal(getRingSegment(150, 40, 300, [0, 1, 0, 0]), 1);
assert.equal(getRingSegment(0, 0, 0, counts), null);
console.log('PASS: ring hit testing, responsive sizes, selected offset, center, empty and single segment');
