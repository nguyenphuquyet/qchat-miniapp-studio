# {{name}}

A QChat Mini App built with React + Vite. The `@qchat/miniapp-sdk` bridge client
is vendored under `src/sdk/` so this project builds standalone.

## Develop

```sh
npm install
npm run dev
```

## Package for QChat

```sh
npm run build
```

This runs `vite build` and then `scripts/package.mjs`, which produces
`release/{{appId}}-<version>.zip`. Upload that ZIP to the QChat Developer Center
(or via `POST /api/miniapps/developer/apps/:appId/builds` with an API key).

## Manifest

Edit `qchat.manifest.json` to change `version`, `requestedPermissions` or the
display name. `appId` must match the app created in the Developer Center
(format `mp_<12-24 hex chars>`).
