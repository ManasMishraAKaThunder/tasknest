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

  // IMPORTANT: only send rule fields, never touch "fields" here —
  // resending fields without their existing ids corrupted a collection
  // earlier (see docs/PACKAGE-ISSUES.md).
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

// WORKAROUND: Solarch does NOT support the `?=` operator (PocketBase's "any match").
// It silently treats `?` as a ternary operator, causing the rule to always fail.
// Instead of complex back-relation rules like:
//   workspace_members_via_workspace.user ?= @request.auth.id
// We use simpler ownership rules:
//   workspace.owner = @request.auth.id
// For full membership-based access, the app also checks membership client-side.

async function main() {
  const token = await login();

  // Workspaces: any authed user can create; owner can update/delete;
  // list/view uses owner check (membership-based scoping is broken in Solarch)
  await setRules("workspaces", {
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
  }, token);

  // Workspace members: user can see own memberships, owner can see all
  await setRules("workspace_members", {
    listRule: "user = @request.auth.id || workspace.owner = @request.auth.id",
    viewRule: "user = @request.auth.id || workspace.owner = @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "workspace.owner = @request.auth.id",
    deleteRule: "workspace.owner = @request.auth.id",
  }, token);

  // Boards: scoped to workspace owner
  await setRules("boards", {
    listRule: "workspace.owner = @request.auth.id",
    viewRule: "workspace.owner = @request.auth.id",
    createRule: "workspace.owner = @request.auth.id",
    updateRule: "workspace.owner = @request.auth.id",
    deleteRule: "workspace.owner = @request.auth.id",
  }, token);

  // Lists: scoped via board → workspace → owner
  await setRules("lists", {
    listRule: "board.workspace.owner = @request.auth.id",
    viewRule: "board.workspace.owner = @request.auth.id",
    createRule: "board.workspace.owner = @request.auth.id",
    updateRule: "board.workspace.owner = @request.auth.id",
    deleteRule: "board.workspace.owner = @request.auth.id",
  }, token);

  // Tasks: scoped via list → board → workspace → owner
  await setRules("tasks", {
    listRule: "list.board.workspace.owner = @request.auth.id",
    viewRule: "list.board.workspace.owner = @request.auth.id",
    createRule: "list.board.workspace.owner = @request.auth.id",
    updateRule: "list.board.workspace.owner = @request.auth.id",
    deleteRule: "list.board.workspace.owner = @request.auth.id",
  }, token);

  console.log("\nAll rules set.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});