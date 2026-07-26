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

## 🔴 JS hook `onRecordCreate` tag parameter is silently discarded
In `dist/tools/jsvm/jsvm.js`, the JSVM sandbox registers record hooks as:
```js
onRecordCreate: (tag, handler) => app.onRecordCreate.bindFunc(handler)
```
The `tag` parameter (e.g. `'workspaces'`) is accepted in the function
signature but **never forwarded** to the underlying `TaggedHook.bind()`
method. `bindFunc(handler)` calls `bind({ func: handler })` with no
`tags` property, so the handler goes into the global (untagged) handler
list instead of the per-collection `tagHandlers` map. The same bug
affects `onRecordUpdate` and `onRecordDelete`.
**Impact**: hooks registered with a collection filter (the documented
API per the README) are never scoped — they would fire for ALL
collections, not just the one specified. Combined with the next bug,
they never fire at all.
**Fix**: pass the tag through: `bindFunc` should call
`bind({ func: handler, tags: [tag] })`.

## 🔴 `onRecordCreate` / `onRecordUpdate` / `onRecordDelete` hooks are never triggered
The `save()` method in `dist/core/base.js` fires
`onRecordAfterCreateSuccess.triggerForTag(model.collectionId, ...)` but
**never fires** `onRecordCreate.trigger()` or
`onRecordCreate.triggerForTag()`. The `onRecordCreate` hook object
exists and accepts handler registrations, but no code path ever
triggers it. The same applies to `onRecordUpdate` and `onRecordDelete`
— only the `*AfterCreateSuccess` / `*AfterUpdateSuccess` /
`*AfterDeleteSuccess` variants are triggered.
Furthermore, `triggerForTag()` only checks the `tagHandlers` map, not
the global `handlers` array, so even if a handler was registered
(untagged, per the previous bug), it would still never fire.
**Impact**: the **entire JS hook system for record events is
non-functional**. Any hook using `onRecordCreate`, `onRecordUpdate`,
or `onRecordDelete` silently does nothing.
**Fix**: either (a) fire `onRecordCreate.trigger()` and
`onRecordCreate.triggerForTag()` in the `save()` flow before/after the
actual insert, or (b) rename the JSVM bindings to match the hooks that
ARE triggered (`onRecordAfterCreateSuccess`, etc.) and expose those.

## 🔴 `$app.newRecord()` does not exist in JSVM sandbox
The README shows hooks using `$app.newRecord(collection)` to create
new record instances for saving. However:
1. The `BaseApp` class has no `newRecord()` method at all.
2. The JSVM `createAppProxy()` in `jsvm.js` only exposes:
   `settings`, `db`, `logger`, `findCollectionByNameOrId`,
   `findAllCollections`, `save`, `delete`, `generateJWT`, `parseJWT`,
   `hashPassword`, `verifyPassword`, `dataDir`, `isDev`.
3. The `RecordModel` constructor (`new RecordModel(collectionId,
   collectionName, data)`) is not importable in the VM sandbox since
   `require` is not available.
Calling `$app.newRecord(collection)` in a hook throws
`TypeError: $app.newRecord is not a function`, but this error is
swallowed silently because the hook never fires anyway (see previous
bug).
**Impact**: even if the hook system were fixed, hooks cannot create
new records programmatically — the fundamental use case for
server-side hooks.
**Fix**: add `newRecord(collection)` to both `BaseApp` and the JSVM
`createAppProxy`, returning `new RecordModel(collection.id,
collection.name, {})`.

## 🔴 `stripProtectedFields` silently strips `role` from ALL collections
`RecordUpsertForm.stripProtectedFields()` in `record_upsert.js` has a
hardcoded list of protected field names that get stripped from every
record create/update request. The list includes `'role'`, which makes
sense for auth collections (to prevent users escalating their own role),
but it's applied **globally to ALL collections**, including base
collections that legitimately have a field named `role`.
In TaskNest, the `workspace_members` collection has a `role` select
field (owner/member) — every attempt to set it is silently stripped,
causing required-field validation to fail.
**Impact**: any base collection with a field named `role` is broken.
The field can be defined but never written to via the API.
**Workaround**: rename the field to something else (e.g. `memberRole`).
**Fix**: only strip auth-specific protected fields when the target
collection `isAuth()`, not universally.

## 🔴 `?=` (any-match) operator not implemented in rule expressions
The rule expression parser in `record_field_resolver.js` supports
operators `!=`, `==`, `>=`, `<=`, `=`, `>`, `<`, `~`, `%`, `@` but
does NOT include `?=` (PocketBase's "any element in array matches"
operator). When a rule uses `?=`, the parser falls through to the
ternary `?` handler (line 354), which silently produces wrong results
or returns false. The README doesn't explicitly document `?=` but the
back-relation system returns arrays, so rules need an array-match
operator to be useful.
**Impact**: back-relation rules like
`workspace_members_via_workspace.user ?= @request.auth.id` silently
fail, making the entire relation-based rule system unusable.
**Fix**: add `?=` to the operators list with semantics: "return true
if the left value is an array and any element equals the right value."

## 🔴 `canAccessRecord` does not pass `app` to `RecordFieldResolver`
In `record_helpers.js:104-108`, the `canAccessRecord()` function
creates a `RecordFieldResolver` with `{ record, collection,
requestInfo }` but omits the `app` parameter. Without `app`:
1. Relation traversal (e.g. `workspace.owner`) can't resolve — the
   resolver gets the workspace ID string but can't look up the actual
   workspace record to read its `owner` field.
2. Back-relation queries (e.g. `workspace_members_via_workspace`)
   short-circuit because `resolveRecordField` checks `this.app` and
   returns `[]` when it's null.
This means **all relation-based API rules silently deny access**,
regardless of what the rule expression says.
**Impact**: the documented rule system (which implies PocketBase-like
relation traversal) is completely non-functional. Every rule that
references fields on a related record always returns false → 403.
**Workaround**: use only simple field checks on the record itself
(e.g. `owner = @request.auth.id` on the workspaces collection) or
`@request.auth.id != ''` for auth-only, and enforce scoping in the
frontend.
**Fix**: pass `app` to the resolver: `new RecordFieldResolver({
app, record, collection, requestInfo })`.

## 🟡 Auth collection record creation returns `{ token, record }` instead of just the record
When creating a record in an auth-type collection (e.g. `users`) via
`POST /api/collections/users/records`, the response body is
`{ token: "...", record: { id: "...", ... } }` — the record is nested
inside a `record` property alongside a pre-generated auth token.
This differs from base collections which return the record directly.
Not necessarily a bug (PocketBase does something similar), but it's
undocumented and surprising — especially since the existing `setup-
collections.js` script assumed `data.id` would exist on the response.