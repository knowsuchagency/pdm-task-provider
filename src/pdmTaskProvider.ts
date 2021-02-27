import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as TOML from '@iarna/toml';

export class PDMTaskProvider implements vscode.TaskProvider {
	static PDMType = 'pdm';
	private pdmPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, 'pyproject.toml');
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
				'pdm',
				new vscode.ShellExecution(`pdm run ${definition.task}`)
			);
		}
		return undefined;
	}
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('PDM pyproject.toml Auto Detection');
	}
	return _channel;
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
		const pyprojectTomlFile = path.join(folderString, 'pyproject.toml');
		if (!fs.existsSync(pyprojectTomlFile)) {
			continue;
		}

		let fileData: string = '';

		fs.readFile(pyprojectTomlFile, 'utf8', (err, data) => {
			if (err) {
				console.log(err);
				getOutputChannel().appendLine(err.message);
				getOutputChannel().show(true);
			} else {
				fileData = data;
			}
		});

		if (!fileData) {
			continue;
		}

		const parsed: any = TOML.parse(fileData);

		for (const command in parsed.tool.pdm.scripts) {
			if (!['_', 'env_file'].includes(command)) {
				const taskName = command;
				const kind: PDMTaskDefinition = {
					type: 'pdm',
					task: taskName,
				};
				const task = new vscode.Task(
					kind,
					workspaceFolder,
					taskName,
					'pdm',
					new vscode.ShellExecution(`pdm run ${taskName}`)
				);
				result.push(task);
			}
		}
	}
	return result;
}
