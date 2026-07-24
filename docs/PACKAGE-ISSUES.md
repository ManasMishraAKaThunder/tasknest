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

## 🔴 Relation fields accept invalid/non-existent collectionId with no validation
Creating a collection with a relation field set to a `collectionId` that
doesn't correspond to any real collection (e.g. the string `"users"`
before a `users` collection existed) succeeds silently — no error,
no validation. The API clearly has collection-existence validation
available elsewhere (`GET /api/collections/:id` correctly 404s for a
missing collection), but it isn't applied when defining relation fields
on collection create/update.
**Impact**: lets you create broken schemas that only fail later, at
usage time, far from the actual mistake.
**Fix**: validate relation `collectionId` against existing collections
at creation/update time and reject with a 400 if invalid.

## 🔴 PATCH /api/collections crashes the collection (500 on all future reads) if fields array omits existing field `id`s
Sending a `PATCH` to update a collection's `fields` array without
including the existing `id` for already-defined fields corrupts the
collection record. After this, even a plain `GET` on that collection
returns `500 Internal Server Error` with server log `[ERROR] f.toJSON
is not a function` — the collection is permanently broken until deleted
and recreated from scratch.
**Impact**: this is a real data-loss/corruption risk — a single
malformed PATCH request takes down a collection with no recovery path
short of delete + recreate (losing any records in it).
**Fix**: PATCH should validate/merge field definitions safely, and
under no circumstances should a stored collection become unreadable
(500 on GET) — that's a serialization bug that should throw at the
call site, not corrupt persisted state.

## 🟡 collectionName not auto-populated on relation fields, even with a valid collectionId
Even after fixing the relation to use a real, valid `collectionId`, the
API response still shows `"collectionName":""` instead of resolving it
to `"users"`. Not breaking, but inconsistent with a system that's
supposed to resolve relations (back-relations, `collection_via_fieldName`
lookups per the README).
**Impact**: minor — mostly a symptom that relations aren't fully
resolved/validated server-side.
**Fix**: populate `collectionName` from the resolved collection at
write time, matching what the README implies.