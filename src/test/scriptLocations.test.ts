import * as assert from "assert";
import { findScriptLocations, splitDottedKey } from "../scriptLocations";

const cases: [string, () => void][] = [
  [
    "splits dotted and quoted keys",
    () => {
      assert.deepStrictEqual(splitDottedKey("tool.pdm.scripts"), [
        "tool",
        "pdm",
        "scripts",
      ]);
      assert.deepStrictEqual(splitDottedKey(' tool . pdm . "my.script" '), [
        "tool",
        "pdm",
        "my.script",
      ]);
      assert.strictEqual(splitDottedKey("tool..pdm"), undefined);
    },
  ],
  [
    "finds scripts in every pdm form",
    () => {
      const text = [
        "[project]", // 0
        'name = "demo"', // 1
        "", // 2
        "[tool.pdm.scripts]", // 3
        '_.env_file = ".env"', // 4
        'env_file = ".env"', // 5
        'start = "flask run"', // 6
        'test.cmd = "pytest"', // 7
        'test.help = "run tests"', // 8
        'lint = {shell = "ruff check ."}', // 9
        '"quoted-name" = "echo hi"', // 10
        "# commented = 1", // 11
        'doc = """', // 12
        "not_a_script = 1", // 13
        '"""', // 14
        "all = [", // 15
        '  "a",', // 16
        "]", // 17
        "", // 18
        "[tool.pdm.scripts.serve] # sub-table", // 19
        'cmd = "uvicorn app:app"', // 20
        'help = "serve"', // 21
        "", // 22
        "[tool.ruff]", // 23
        "line-length = 100", // 24
      ].join("\n");
      assert.deepStrictEqual(findScriptLocations(text), [
        { name: "start", line: 6 },
        { name: "test", line: 7 },
        { name: "lint", line: 9 },
        { name: "quoted-name", line: 10 },
        { name: "doc", line: 12 },
        { name: "all", line: 15 },
        { name: "serve", line: 19 },
      ]);
    },
  ],
  [
    "ignores other tables and arrays of tables",
    () => {
      const text = [
        "[tool.pdm]",
        'distribution = false',
        "[[tool.pdm.source]]",
        'name = "private"',
        "[tool.pdm.scripts_other]",
        'x = "y"',
      ].join("\r\n");
      assert.deepStrictEqual(findScriptLocations(text), []);
    },
  ],
];

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${e}`);
  }
}
if (failed) {
  process.exit(1);
}
