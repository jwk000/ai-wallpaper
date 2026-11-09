# [desktop / Windows] "Open in VS Code" always fails: `ELECTRON_RUN_AS_NODE=1` leaks into the detached launcher environment

> Target: `https://github.com/deepseek-ai/deepseek-harness/discussions`
> (the repository has `has_issues: false`; Discussions is the only open channel)

## Summary

On Windows, the Session header's "Open in …" split button can never launch VS Code
(or any other Electron-based target) from the desktop app. The host spawns
`Code.exe <workspace>` with an environment inherited from the desktop host, and that
environment carries `ELECTRON_RUN_AS_NODE=1`. The child therefore starts as a **Node.js
runtime** instead of the Electron GUI, exits non-zero within ~200 ms, and the launch is
classified as failed:

```
POST /open-in-app/open  ->  502 { "code": "launch-failed", "message": "failed to launch vscode" }
```

## Environment

| Item | Value |
| --- | --- |
| DSH | 0.2.2-rc.1 (desktop, Windows x64) |
| OS | Windows 11 Pro, build 26300 |
| Target app | VS Code 1.145.0, **per-user** install (`%LOCALAPPDATA%\Programs\Microsoft VS Code`) |
| Shell | PowerShell 7 |

## Steps to reproduce

1. Open the desktop app on Windows with a workspace folder.
2. Click the "Open in …" split button in the Session header and pick **VS Code**.
3. Observe: no window opens; the request fails with `502 launch-failed`.

## Expected

VS Code opens on the workspace directory.

## Actual

Nothing opens. The launched process dies immediately with exit code 1.

## Evidence

### 1. What the child actually printed

Running the exact launch (`Code.exe "D:\GameDev\ai-wallpaper"`) with the host's
environment produces:

```
D:\GameDev\ai-wallpaper\node_modules\electron-updater\out\ElectronAppAdapter.js:14
        return this.app.getVersion();
                        ^

TypeError: Cannot read properties of undefined (reading 'getVersion')
    at new AppUpdater (...)
    at Object.<anonymous> (D:\GameDev\ai-wallpaper\src\main\updater.js:4:9)
Node.js v24.22.1
```

This is the workspace project's own Electron main entry point being executed by
Node — proof that `Code.exe` was started in `ELECTRON_RUN_AS_NODE` mode, not as a GUI.

### 2. Control experiment

| `ELECTRON_RUN_AS_NODE` | Result of `Code.exe <workspace>` |
| --- | --- |
| `1` (inherited from the host) | exits **code 1** in 47–187 ms, no window, 0 `Code` processes |
| removed | still running after 1000 ms, 10 `Code` processes, window opens on the workspace |

### 3. Why the button reports failure

`@deepseek-ai/dsh-host-open-in-app` launches through `launchDetachedApp`, which treats
a non-zero exit **inside the watch window** (`launchWatchMs`, default 1000 ms) as a
failed launch:

```js
child.on('exit', (code, signalName) => {
    if (code === 0) settle(resolve);
    else settle(() => reject(new Error(`launcher exited with code ${code}...`)));
});
```

A 47–187 ms crash lands squarely inside that window, so the route answers 502 even
though the executable was found and started correctly.

## Root cause

The desktop host (`dsh-desktop-host`) runs inside the Electron binary in Node mode, which
requires `ELECTRON_RUN_AS_NODE=1` in its own environment. `launchDetachedApp` builds the
child environment as:

```js
env: { ...scrubbedParentEnv(), ...options.env }
```

`scrubbedParentEnv()` only drops credential-shaped variables (`*KEY*`, `*PASSWORD*`,
`*SECRET*`, `*TOKEN*`), so `ELECTRON_RUN_AS_NODE` passes straight through to a child
that is itself an Electron application.

Note the same leak is observable one level further out: commands executed through the
agent's shell tools inherit `ELECTRON_RUN_AS_NODE=1` as well, so anything those commands
launch that happens to be Electron-based fails the same way.

## Affected catalog entries

Any Electron target on Windows resolves to its GUI executable and is broken by this:

- `vscode`, `vscodeinsiders`, `cursor`, `windsurf`, `zed`

JVM targets (JetBrains IDEs), native terminals, and the `shell-open` file managers are
unaffected.

## Proposed fix

Strip the Electron runtime override when building a child environment. The narrow fix:

```js
// @deepseek-ai/dsh-host-open-in-app — resolver.ts, launchDetachedApp
const env = { ...scrubbedParentEnv(), ...options.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;
```

The systemic fix, which also covers agent-run shell commands, is in
`@deepseek-ai/dsh-subprocess`:

```ts
// scrubbedParentEnv(): never forward the harness's own Electron runtime mode
delete env.ELECTRON_RUN_AS_NODE;
```

Either way, please also consider an assertion in the existing injectable launch seam
(`internals.launch`) so a unit test can check that the child environment never contains
`ELECTRON_RUN_AS_NODE`, even when the parent has it set.

## Workaround for users

Until this is fixed, launch the folder through the `code` CLI, which handles the runtime
mode itself:

```powershell
code .
```

(The `code.cmd` shim switches to `cli.js` and lets the CLI re-spawn the real GUI process,
so it is unaffected.)
