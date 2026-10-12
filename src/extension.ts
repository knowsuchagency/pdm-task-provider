/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import { PDMTaskProvider } from "./pdmTaskProvider";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      PDMTaskProvider.PDMType,
      new PDMTaskProvider(context)
    )
  );
}

export function deactivate(): void {}
