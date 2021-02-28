import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as TOML from "@iarna/toml";

export class PDMTaskProvider implements vscode.TaskProvider {
  static PDMType = "pdm";
  private pdmPromise: Thenable<vscode.Task[]> | undefined = undefined;

  constructor(workspaceRoot: string) {
    const pattern = path.join(workspaceRoot, "pyproject.toml");
    const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    fileWatcher.onDidChange(() => (this.pdmPromise = undefined));
    fileWatcher.onDidCreate(() => (this.pdmPromise = undefined));
    fileWatcher.onDidDelete(() => (this.pdmPromise = undefined));
  }

  public provideTasks(): Thenable<vscode.Task[]> | undefined {
    if (!this.pdmPromise) {
      this.pdmPromise = getPdmTasks();
    }
    return this.pdmPromise;
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    const task = _task.definition.task;
    if (task) {
      const definition: PDMTaskDefinition = <any>_task.definition;
      return new vscode.Task(
        definition,
        _task.scope ?? vscode.TaskScope.Workspace,
        definition.task,
        "pdm",
        new vscode.ShellExecution(`pdm run ${definition.task}`)
      );
    }
    return undefined;
  }
}

let channel: vscode.OutputChannel = vscode.window.createOutputChannel(
  "PDM Task Provider"
);

function info(message: string) {
  console.info(message);
  channel.appendLine(message);
}

function error(message: string) {
  console.error(message);
  channel.show(true);
  channel.appendLine(message);
}

interface PDMTaskDefinition extends vscode.TaskDefinition {
  /**
   * The task name
   */
  task: string;

  /**
   * The pyproject.toml file containing the task
   */
  file?: string;
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
      error("no pyproject.toml detected");
      continue;
    }


    const fileData = fs.readFileSync(pyprojectTomlFile, { encoding: "utf8" });

    info("opened pyproject.toml");

    if (!fileData) {
      error("unable to open pyproject.toml");
      continue;
    }

    const parsed: any = TOML.parse(fileData);

    for (const command in parsed.tool.pdm.scripts) {
      const isCommandAttribute: boolean = !["_", "env_file"].includes(command);
      if (isCommandAttribute) {
        info(`pdm command found: ${command}`);
        const taskName = command;
        const taskDefinition: PDMTaskDefinition = {
          type: "pdm",
          task: taskName,
        };
        const task = new vscode.Task(
          taskDefinition,
          workspaceFolder,
          taskName,
          "pdm",
          new vscode.ShellExecution(`pdm run ${taskName}`),
          []
        );
        result.push(task);
      }
    }
  }
  return result;
}
