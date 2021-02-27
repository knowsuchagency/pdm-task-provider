/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { PDMTaskProvider } from './pdmTaskProvider';

let pdmTaskProvider: vscode.Disposable | undefined;
let customTaskProvider: vscode.Disposable | undefined;

export function activate(_context: vscode.ExtensionContext): void {
	const workspaceRoot = vscode.workspace.rootPath;
	if (!workspaceRoot) {
		return;
	}
		
	pdmTaskProvider = vscode.tasks.registerTaskProvider(PDMTaskProvider.PDMType, new PDMTaskProvider(workspaceRoot));
}

export function deactivate(): void {
	if (pdmTaskProvider) {
		pdmTaskProvider.dispose();
	}
}