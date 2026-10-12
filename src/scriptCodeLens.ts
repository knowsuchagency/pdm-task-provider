import * as path from "path";
import * as vscode from "vscode";
import * as TOML from "@iarna/toml";
import {
  CONFIG_SECTION,
  PDMTaskDefinition,
  PDMTaskProvider,
  createPdmTask,
  scriptNames,
} from "./pdmTaskProvider";
import { findScriptLocations } from "./scriptLocations";

export const RUN_SCRIPT_COMMAND = "pdmTaskProvider.runScript";

export const PYPROJECT_SELECTOR: vscode.DocumentFilter = {
  scheme: "file",
  pattern: "**/pyproject.toml",
};

/** Puts a "Run" button above each script in [tool.pdm.scripts]. */
export class ScriptCodeLensProvider implements vscode.CodeLensProvider {
  private changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.changed,
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(`${CONFIG_SECTION}.codeLens`)) {
          this.changed.fire();
        }
      })
    );
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const enabled = vscode.workspace
      .getConfiguration(CONFIG_SECTION, document.uri)
      .get<boolean>("codeLens", true);
    if (!enabled) {
      return [];
    }
    const text = document.getText();
    let locations = findScriptLocations(text);

    // When the file parses, trust the parser for which scripts exist; while it
    // is mid-edit and does not, fall back to the line scan alone.
    try {
      const names = new Set(scriptNames(TOML.parse(text)));
      locations = locations.filter((l) => names.has(l.name));
    } catch {
      // keep the line scan's results
    }

    return locations.map(
      ({ name, line }) =>
        new vscode.CodeLens(document.lineAt(line).range, {
          title: "$(play) Run",
          tooltip: `pdm run ${name}`,
          command: RUN_SCRIPT_COMMAND,
          arguments: [document.uri, name],
        })
    );
  }
}

export async function runScript(uri: vscode.Uri, name: string): Promise<void> {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  const cwd = path.dirname(uri.fsPath);
  const definition: PDMTaskDefinition = {
    type: PDMTaskProvider.PDMType,
    task: name,
  };
  if (folder && cwd !== folder.uri.fsPath) {
    definition.file = path.relative(folder.uri.fsPath, uri.fsPath);
  }
  await vscode.tasks.executeTask(
    createPdmTask(definition, folder ?? vscode.TaskScope.Workspace, folder, cwd)
  );
}
