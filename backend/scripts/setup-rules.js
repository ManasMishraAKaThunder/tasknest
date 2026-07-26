require("dotenv/config");

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 8090}`;

async function login() {
  const res = await fetch(`${BASE}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("Login failed: " + JSON.stringify(data));
  return data.token;
}

async function getCollectionByName(name, token) {
  const res = await fetch(`${BASE}/api/collections/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return res.json();
}

async function setRules(name, rules, token) {
  const existing = await getCollectionByName(name, token);
  if (!existing) throw new Error(`${name} not found`);

  const res = await fetch(`${BASE}/api/collections/${existing.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rules),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Set rules on ${name} failed: ${JSON.stringify(data)}`);
  console.log(`✓ rules set on ${name}`);
  return data;
}

// WORKAROUND: Solarch's RecordFieldResolver.canAccessRecord() does NOT pass `app`
// to the resolver (record_helpers.js:104-108), which means:
//   - Relation traversal in rules (e.g. workspace.owner) can't resolve
//   - Back-relation queries (e.g. workspace_members_via_workspace) can't execute
//   - The ?= (any-match) operator doesn't exist
// All relation-based rules silently return false → 403.
//
// Workaround: use simple auth-check rules. Access scoping is enforced
// in the frontend by filtering to the user's own workspaces.

const AUTHED = "@request.auth.id != ''";

async function main() {
  const token = await login();

  await setRules("workspaces", {
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: AUTHED,
    updateRule: AUTHED,
    deleteRule: AUTHED,
  }, token);

  await setRules("workspace_members", {
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: AUTHED,
    updateRule: AUTHED,
    deleteRule: AUTHED,
  }, token);

  await setRules("boards", {
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: AUTHED,
    updateRule: AUTHED,
    deleteRule: AUTHED,
  }, token);

  await setRules("lists", {
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: AUTHED,
    updateRule: AUTHED,
    deleteRule: AUTHED,
  }, token);

  await setRules("tasks", {
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: AUTHED,
    updateRule: AUTHED,
    deleteRule: AUTHED,
  }, token);

  console.log("\nAll rules set (auth-only, see PACKAGE-ISSUES.md for why relation rules don't work).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});