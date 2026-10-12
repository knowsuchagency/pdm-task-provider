# [PDM Task Provider](https://marketplace.visualstudio.com/items?itemName=knowsuchagency.pdm-task-provider)

[**Task**][tasks] provider for [**pdm**][pdm].


[pyproject.toml]
```
[tool.pdm.scripts]
start_server = "flask run -p 54321"
```

### From Tasks Global Menu
![](static/entrypoint.png)

### Select PDM
![](static/all_tasks.png)

[pdm]: https://pdm.fming.dev
[tasks]: https://code.visualstudio.com/docs/editor/tasks

### Select Task from pyproject.toml
![](static/pdm_tasks.png)

### Running pdm through a wrapper

If pdm isn't on your `PATH`, set `pdmTaskProvider.pdmCommand` to the command that runs it,
for example `python -m pdm`. Projects that install pdm with the [pyprojectx](https://pyprojectx.github.io)
`pw` wrapper work without configuration: when a `pw` script sits next to `pyproject.toml`, tasks run
as `./pw pdm run <task>` (`.\pw.bat pdm run <task>` on Windows).

<footer>
<a href="https://iconscout.com/icons/python" target="_blank">Python Icon</a> on <a href="https://iconscout.com">Iconscout</a>
</footer>
