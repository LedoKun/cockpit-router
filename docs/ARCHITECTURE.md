# Architecture

Router Admin is a single-page Cockpit application built with React and
PatternFly.

## Entry Points

- `src/index.tsx` mounts the React application.
- `src/app.tsx` defines the application shell, navigation, route metadata, and
  live service status header.
- `src/manifest.json` registers the Cockpit tool and requires superuser mode.
- `src/routerUtils.js` contains shared formatting and status helpers.

## Module Pattern

Each router feature lives in its own `src/*Admin.jsx` or status component. A
module usually contains:

- local React state for configuration, command output, loading, and messages
- `cockpit.spawn()` calls for service and system commands
- `cockpit.file()` reads and writes for editable config files
- a PatternFly toolbar for actions
- PatternFly cards for status, metrics, tables, and editors
- a 15 second refresh loop when the view displays live status

The app shell in `src/app.tsx` owns route selection. Add a new module by:

1. Creating a component in `src/`.
2. Importing it in `src/app.tsx`.
3. Adding a route entry with `label`, `component`, `group`, and optional `service`.

## Privileges

The manifest contains:

```json
"superuser": "require"
```

This makes Cockpit run the module with elevated privileges. The UI can therefore
write system config files and run service-management commands. Treat every
button as an administrative action.

## Command Execution

Commands are executed with argument arrays, for example:

```js
cockpit.spawn(["systemctl", "restart", "dnsmasq"], { err: "message" })
```

Avoid shell strings unless shell expansion is explicitly required. The current
code only uses `sh -c` for removing wildcard Unbound RPZ files.

## File Editing

Configuration editors use:

```js
const file = cockpit.file("/path/to/config");
await file.read();
await file.replace(newText);
```

Save actions should report success or failure in a PatternFly alert and reload
or restart the affected service when that is required for the change to apply.

## Auto Refresh

Live views use a `setInterval(..., 15000)` loop and clear it on unmount. Each
view exposes a Start/Stop Auto-Refresh button where live data is shown.

## Styling

Global app styling belongs in `src/app.scss`. Keep module-specific layout simple
and prefer PatternFly components and utility classes over bespoke CSS.
