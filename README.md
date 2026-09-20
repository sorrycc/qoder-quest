# qoder-quest

A booth game for Qoder CLI. Visitors pick a level on a map, read the task on the left, and drive a real `qodercli` in the terminal on the right. The server checks the sandbox every 5 seconds and fires confetti when the level passes. The UI is Chinese by default, with an English toggle in the top right.

```bash
pnpm install
pnpm start    # build and serve at http://localhost:4318
pnpm dev      # server on 4318, Vite on 4319
pnpm test
```

You need Node 22 or later and a logged-in `qodercli`. Set `QODER_MODEL` to pick a faster model and `QODER_CONFIG_DIR` to keep personal skills and MCP servers out of the demo.

To add a level, create `tasks/<id>/` with a `task.json` and a `template/` directory, then refresh the page. `TaskDef` in `src/types.ts` lists the fields. Staff turn levels and video generation on or off from the settings page at the bottom of the map.

Visitors get a real `qodercli` in auto permission mode, so keep secrets off the booth machine and keep a staff member nearby.

## License

[MIT](./LICENSE)
