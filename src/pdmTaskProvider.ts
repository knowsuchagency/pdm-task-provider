import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as TOML from "@iarna/toml";

export class PDMTaskProvider implements vscode.TaskProvider {
  static PDMType = "pdm";
  private pdmPromise: Thenable<vscode.Task[]> | undefined = undefined;

  constructor(context: vscode.ExtensionContext) {
    const invalidate = () => (this.pdmPromise = undefined);
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/{pyproject.toml,pw,pw.bat}"
    );
    fileWatcher.onDidChange(invalidate);
    fileWatcher.onDidCreate(invalidate);
    fileWatcher.onDidDelete(invalidate);
    context.subscriptions.push(
      fileWatcher,
      vscode.workspace.onDidChangeWorkspaceFolders(invalidate),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(CONFIG_SECTION)) {
          invalidate();
        }
      })
    );
  }

  public provideTasks(): Thenable<vscode.Task[]> | undefined {
    if (!this.pdmPromise) {
      this.pdmPromise = getPdmTasks();
    }
    return this.pdmPromise;
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    const definition: PDMTaskDefinition = <any>_task.definition;
    if (!definition.task) {
      return undefined;
    }
    const scope = _task.scope ?? vscode.TaskScope.Workspace;
    const folder = isWorkspaceFolder(scope)
      ? scope
      : vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return undefined;
    }
    const cwd = definition.file
      ? path.dirname(path.resolve(folder.uri.fsPath, definition.file))
      : folder.uri.fsPath;
    return createPdmTask(definition, scope, folder, cwd);
  }
}

export const CONFIG_SECTION = "pdmTaskProvider";

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel("PDM Task Provider");
  }
  return channel;
}

function info(message: string) {
  console.info(message);
  getChannel().appendLine(message);
}

function error(message: string) {
  console.error(message);
  getChannel().appendLine(message);
}

export interface PDMTaskDefinition extends vscode.TaskDefinition {
  /**
   * The task name
   */
  task: string;

  /**
   * The pyproject.toml file containing the task
   */
  file?: string;
}

function isWorkspaceFolder(scope: unknown): scope is vscode.WorkspaceFolder {
  return typeof scope === "object" && scope !== null && "uri" in scope;
}

/**
 * The command that invokes pdm for a project in `cwd`.
 *
 * Uses the `pdmTaskProvider.pdmCommand` setting when set. Otherwise, when the
 * project uses the pyprojectx wrapper (a `pw` script next to pyproject.toml),
 * pdm is run through it, since pdm is then not on PATH. Falls back to `pdm`.
 */
export function getPdmCommand(
  folder: vscode.WorkspaceFolder | undefined,
  cwd: string
): string {
  const configured = vscode.workspace
    .getConfiguration(CONFIG_SECTION, folder?.uri)
    .get<string>("pdmCommand", "")
    .trim();
  if (configured) {
    return configured;
  }
  if (process.platform === "win32") {
    if (fs.existsSync(path.join(cwd, "pw.bat"))) {
      return ".\\pw.bat pdm";
    }
  } else if (fs.existsSync(path.join(cwd, "pw"))) {
    return "./pw pdm";
  }
  return "pdm";
}

export function createPdmTask(
  definition: PDMTaskDefinition,
  scope: vscode.WorkspaceFolder | vscode.TaskScope,
  folder: vscode.WorkspaceFolder | undefined,
  cwd: string
): vscode.Task {
  const pdm = getPdmCommand(folder, cwd);
  return new vscode.Task(
    definition,
    scope,
    definition.task,
    "pdm",
    new vscode.ShellExecution(`${pdm} run ${definition.task}`, { cwd }),
    []
  );
}

/**
 * Script names defined under [tool.pdm.scripts] in a parsed pyproject.toml.
 * `_` (shared options) and `env_file` are settings, not scripts.
 */
export function scriptNames(parsed: any): string[] {
  const scripts = parsed?.tool?.pdm?.scripts;
  if (!scripts || typeof scripts !== "object") {
    return [];
  }
  return Object.keys(scripts).filter(
    (name) => !["_", "env_file"].includes(name)
  );
}

async function getPdmTasks(): Promise<vscode.Task[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const result: vscode.Task[] = [];
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return result;
  }
  for (const workspaceFolder of workspaceFolders) {
    const folderString = workspaceFolder.uri.fsPath;
    if (!folderString) {
      continue;
    }
    const pyprojectTomlFile = path.join(folderString, "pyproject.toml");
    if (!fs.existsSync(pyprojectTomlFile)) {
      info(`no pyproject.toml in ${folderString}`);
      continue;
    }

    let parsed: any;
    try {
      parsed = TOML.parse(
        fs.readFileSync(pyprojectTomlFile, { encoding: "utf8" })
      );
    } catch (e) {
      error(`unable to parse ${pyprojectTomlFile}: ${e}`);
      continue;
    }

    for (const taskName of scriptNames(parsed)) {
      info(`pdm command found: ${taskName}`);
      result.push(
        createPdmTask(
          { type: PDMTaskProvider.PDMType, task: taskName },
          workspaceFolder,
          workspaceFolder,
          folderString
        )
      );
    }
  }
  return result;
}
