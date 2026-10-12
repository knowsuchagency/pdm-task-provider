/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import { PDMTaskProvider } from "./pdmTaskProvider";
import {
  PYPROJECT_SELECTOR,
  RUN_SCRIPT_COMMAND,
  ScriptCodeLensProvider,
  runScript,
} from "./scriptCodeLens";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      PDMTaskProvider.PDMType,
      new PDMTaskProvider(context)
    ),
    vscode.languages.registerCodeLensProvider(
      PYPROJECT_SELECTOR,
      new ScriptCodeLensProvider(context)
    ),
    vscode.commands.registerCommand(RUN_SCRIPT_COMMAND, runScript)
  );
}
