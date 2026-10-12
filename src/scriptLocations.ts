export interface ScriptLocation {
  /** The script name, as passed to `pdm run`. */
  name: string;
  /** Zero-based line where the script is defined. */
  line: number;
}

/** Keys under [tool.pdm.scripts] that are settings, not scripts. */
export const NON_SCRIPT_KEYS = ["_", "env_file"];

const SCRIPTS_TABLE = ["tool", "pdm", "scripts"];

/**
 * Split a dotted TOML key (`tool.pdm."my script"`) into its parts.
 * Returns undefined when the key is malformed.
 */
export function splitDottedKey(key: string): string[] | undefined {
  const parts: string[] = [];
  const re = /\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([A-Za-z0-9_-]+))\s*(\.|$)/y;
  let pos = 0;
  while (pos < key.length) {
    re.lastIndex = pos;
    const m = re.exec(key);
    if (!m) {
      return undefined;
    }
    parts.push(m[1] ?? m[2] ?? m[3]);
    pos = re.lastIndex;
    if (m[4] === "") {
      break;
    }
  }
  return parts.length ? parts : undefined;
}

function startsWith(parts: string[], prefix: string[]): boolean {
  return prefix.every((p, i) => parts[i] === p);
}

/** Count unescaped occurrences of a multi-line string delimiter. */
function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let i = line.indexOf(delimiter);
  while (i !== -1) {
    count++;
    i = line.indexOf(delimiter, i + delimiter.length);
  }
  return count;
}

/**
 * Find where each pdm script is defined in the text of a pyproject.toml:
 * keys of the [tool.pdm.scripts] table (`start = "..."`,
 * `test.cmd = "..."`, `lint = {...}`) and sub-tables
 * ([tool.pdm.scripts.serve]). Each script is reported once, at its first line.
 */
export function findScriptLocations(text: string): ScriptLocation[] {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const result: ScriptLocation[] = [];
  const add = (name: string | undefined, line: number) => {
    if (name === undefined || NON_SCRIPT_KEYS.includes(name) || seen.has(name)) {
      return;
    }
    seen.add(name);
    result.push({ name, line });
  };

  let inScripts = false;
  let openString: string | undefined;

  lines.forEach((line, i) => {
    if (openString) {
      if (countDelimiter(line, openString) % 2 === 1) {
        openString = undefined;
      }
      return;
    }

    const header = /^\s*\[\s*([^[\]]+?)\s*\](?!\])/.exec(line);
    if (/^\s*\[\[/.test(line)) {
      inScripts = false;
    } else if (header) {
      const parts = splitDottedKey(header[1]);
      inScripts = false;
      if (parts && startsWith(parts, SCRIPTS_TABLE)) {
        if (parts.length === SCRIPTS_TABLE.length) {
          inScripts = true;
        } else {
          add(parts[SCRIPTS_TABLE.length], i);
        }
      }
    } else if (inScripts) {
      const key = /^\s*((?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[A-Za-z0-9_-]+))*)\s*=/.exec(
        line
      );
      if (key) {
        add(splitDottedKey(key[1])?.[0], i);
      }
    }

    for (const delimiter of ['"""', "'''"]) {
      if (countDelimiter(line, delimiter) % 2 === 1) {
        openString = delimiter;
        break;
      }
    }
  });

  return result;
}
