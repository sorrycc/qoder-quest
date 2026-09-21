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

A level with `showcase` set (the startup boss) keeps each visitor's page under `~/.qoder-quest/showcase`. Clearing the level shows a QR code for it, the page stays reachable at `/p/<id>/` without the password, and the wall linked at the bottom of the map lists every page for review. If phones reach the booth through a proxy or tunnel, set `PUBLIC_URL` so the QR codes point there.

The server runs on macOS, Linux and Windows 10 1809 or later. On Windows it finds `qodercli.exe` or the npm `qodercli.cmd` shim on `PATH` by itself; set `QODERCLI_BIN` to a full path to override. When nobody is playing, `curl localhost:4318/api/health` should report zero sessions and zero processes.

Visitors get a real `qodercli` in auto permission mode, so keep secrets off the booth machine and keep a staff member nearby.

## License

[MIT](./LICENSE)
