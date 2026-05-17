# Maintenance Notes

## Code Checks

Run before committing:

```sh
npm run eslint
npm run stylelint
npx esbuild src/index.tsx --bundle --external:cockpit \
  --external:cockpit-dark-theme --external:*.scss --outfile=/tmp/router-admin.js
```

Use `make` for the full Cockpit build path. The Makefile fetches shared Cockpit
helper files into `pkg/lib` when needed.

## Adding A Page

1. Create `src/NewPage.jsx`.
2. Use PatternFly cards and toolbars for consistency.
3. Use `cockpit.spawn([...], { err: "message" })` for commands.
4. Use `cockpit.file(path).read()` and `.replace()` for file editors.
5. Reuse shared helpers from `src/routerUtils.js` where applicable.
6. Add a route entry in `src/app.tsx`.
7. Add documentation in `docs/OPERATIONS.md`.

## Service Pages

If a page manages a systemd service, add `service: "name"` to its route entry.
The app shell will show a live `systemctl is-active` status chip in the page
header.

## Safety Guidelines

- Prefer argument arrays for `cockpit.spawn`.
- Avoid shell commands unless wildcard expansion or shell syntax is required.
- Keep destructive actions explicit and visible in the UI.
- Refresh status after service or firewall changes.
- Display command errors in PatternFly alerts.
- Do not store secrets in React state longer than needed.

## Packaging Notes

The package name is `router-admin`, which installs to:

```sh
/usr/share/cockpit/router-admin
```

The generated RPM name is:

```sh
cockpit-router-admin
```

AppStream metadata is generated from:

```sh
org.cockpit_project.router_admin.metainfo.xml
```
