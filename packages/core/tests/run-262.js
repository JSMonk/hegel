const path = require("path");
const cp = require("child_process");
const fs = require("fs");
const TestStream = require("test262-stream");

/** The revision of Test262 we test against. @see https://github.com/tc39/test262 */
const TEST_262_SHA = "00770684b54d922fadfc881bbb134ef71bcabf74";

const test262Dir = path.resolve(process.cwd(), "test262");

if (!fs.existsSync(test262Dir)) {
  cp.execSync(
    `git clone git@github.com:tc39/test262.git && cd ${test262Dir} && git reset --hard ${TEST_262_SHA}`
  );
}

const stream = new TestStream(test262Dir, {
  acceptVersion: "2.0.0",
  omitRuntime: true,
});

stream.on("data", function(test) {
  // the path to the file from which the test was derived, relative to the
  // provided Test262 directory
  console.log("test.file", test.file);

  // the complete source text for the test; this contains any "includes"
  // files specified in the frontmatter, "prelude" content if specified (see
  // below), and any "scenario" transformations
  console.log("test.contents", test.contents);

  // an object representation of the metadata declared in the test's
  // "frontmatter" section
  console.log("test.attrs", test.attrs);

  // the licensing information included within the test (if any)
  console.log("test.copyright", test.copyright);

  // name describing how the source file was interpreted to create the test
  console.log("test.scenario", test.scenario);

  // numeric offset within the `contents` string at which one or more
  // statements may be inserted without necessarily invalidating the test
  console.log("test.insertionIndex", test.insertionIndex);
  throw new Error('done')
});

stream.on("end", function() {
  console.log("No further tests.");
});

stream.on("error", function(err) {
  console.error("Something went wrong:", err);
});
