require("dotenv/config");

const BASE = `http://localhost:${process.env.PORT || 8090}`;

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

const MEMBERSHIP = "workspace_members_via_workspace.user ?= @request.auth.id";

async function main() {
  const token = await login();

  await setRules("workspaces", {
    listRule: MEMBERSHIP,
    viewRule: MEMBERSHIP,
    createRule: "@request.auth.id != ''",
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
  }, token);

  await setRules("workspace_members", {
    listRule: "user = @request.auth.id || workspace.owner = @request.auth.id",
    viewRule: "user = @request.auth.id || workspace.owner = @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "workspace.owner = @request.auth.id",
    deleteRule: "workspace.owner = @request.auth.id",
  }, token);

  await setRules("boards", {
    listRule: `workspace.${MEMBERSHIP}`,
    viewRule: `workspace.${MEMBERSHIP}`,
    createRule: `workspace.${MEMBERSHIP}`,
    updateRule: `workspace.${MEMBERSHIP}`,
    deleteRule: `workspace.${MEMBERSHIP}`,
  }, token);

  await setRules("lists", {
    listRule: `board.workspace.${MEMBERSHIP}`,
    viewRule: `board.workspace.${MEMBERSHIP}`,
    createRule: `board.workspace.${MEMBERSHIP}`,
    updateRule: `board.workspace.${MEMBERSHIP}`,
    deleteRule: `board.workspace.${MEMBERSHIP}`,
  }, token);

  await setRules("tasks", {
    listRule: `list.board.workspace.${MEMBERSHIP}`,
    viewRule: `list.board.workspace.${MEMBERSHIP}`,
    createRule: `list.board.workspace.${MEMBERSHIP}`,
    updateRule: `list.board.workspace.${MEMBERSHIP}`,
    deleteRule: `list.board.workspace.${MEMBERSHIP}`,
  }, token);

  console.log("\nAll rules set.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});