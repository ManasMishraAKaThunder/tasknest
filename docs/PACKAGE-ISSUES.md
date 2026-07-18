# Solarch — Issues Found While Testing (TaskNest project)

Severity legend: 🔴 Should fix before release · 🟡 Good to have · ⚪ Note/observation

## 🔴 Admin UI not built into published npm package
The README's Quick Start implies `npm install -g solarch` + `solarch serve`
gives a working Admin UI out of the box. In practice, the server reports
"Admin UI is not built yet" and requires manually running
`cd node_modules/solarch/admin && npm install && npm run build`.
**Impact**: breaks the documented Quick Start for every fresh install.
**Fix**: either ship the pre-built `admin/dist` assets inside the published
npm package, or run the admin build as a `postinstall` script.

## 🔴 `/api/installer` link is broken
When no superuser exists, the server prints:
"No superuser found. Please complete the installation:
Open Installer → http://localhost:8090/api/installer"
Visiting that URL returns `Cannot GET /api/installer`.
**Impact**: the suggested fix path in the server's own error message doesn't work.
**Fix**: either implement that route, or stop advertising it in the message
if the intended flow is the `/_/#/install` admin-UI page instead.

## 🟡 CLI `superuser-create` doesn't load `.env`
`solarch serve` (via the programmatic `Solarch` class + your own `dotenv/config`
import) picks up `.env` fine, but running `npx solarch superuser-create ...`
directly does not — it fails with "JWT secret is not configured" even when
`.env` is present in the working directory, because the CLI doesn't load
dotenv itself. Workaround: `export SOLARCH_JWT_SECRET=...` manually before
running the command.
**Impact**: inconsistent DX between the server process and the CLI.
**Fix**: have the CLI also load `.env` from the working directory (or document
the workaround clearly in the README's CLI Commands section).

## 🟡 No dev-mode fallback for missing JWT secret
Fresh install with `defaultDev: true` still hard-fails if
`SOLARCH_JWT_SECRET` isn't set, rather than generating a throwaway dev
secret with a loud warning. Reasonable to require it in production, but
in dev mode a generated-and-logged secret would smooth first-run experience
(matches "Quick Start... in under 5 minutes" positioning).