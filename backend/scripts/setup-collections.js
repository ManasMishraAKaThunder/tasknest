require("dotenv/config");
const { login } = require("./auth-helper");

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 8090}`;

async function getCollectionByName(name, token) {
  const res = await fetch(`${BASE}/api/collections/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return res.json();
}

async function createCollection(body, token) {
  const res = await fetch(`${BASE}/api/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create ${body.name} failed: ${JSON.stringify(data)}`);
  return data;
}

async function ensureCollection(body, token) {
  const existing = await getCollectionByName(body.name, token);
  if (existing) {
    console.log(`✓ ${body.name} already exists (${existing.id})`);
    return existing;
  }
  const created = await createCollection(body, token);
  console.log(`+ created ${body.name} (${created.id})`);
  return created;
}

async function deleteCollection(name, token) {
  const existing = await getCollectionByName(name, token);
  if (!existing) return;
  const res = await fetch(`${BASE}/api/collections/${existing.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.log(`⚠ delete ${name} failed: ${JSON.stringify(data)} — may have dependents`);
    return;
  }
  console.log(`- deleted ${name} (${existing.id})`);
}

async function recreateCollection(body, token) {
  await deleteCollection(body.name, token);
  const created = await createCollection(body, token);
  console.log(`+ recreated ${body.name} (${created.id})`);
  return created;
}

async function main() {
  const token = await login(BASE);

  const users = await ensureCollection(
    { name: "users", type: "auth", fields: [{ name: "displayName", type: "text" }] },
    token
  );

  const workspaces = await ensureCollection(
    {
      name: "workspaces",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "owner", type: "relation", collectionId: users.id },
      ],
    },
    token
  );

  const workspaceMembers = await ensureCollection(
    {
      name: "workspace_members",
      type: "base",
      fields: [
        { name: "workspace", type: "relation", collectionId: workspaces.id, required: true },
        { name: "user", type: "relation", collectionId: users.id, required: true },
        { name: "memberRole", type: "select", values: ["owner", "member"], required: true },
      ],
    },
    token
  );

  const boards = await ensureCollection(
    {
      name: "boards",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "workspace", type: "relation", collectionId: workspaces.id, required: true },
      ],
    },
    token
  );

  const lists = await ensureCollection(
    {
      name: "lists",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "board", type: "relation", collectionId: boards.id, required: true },
        { name: "position", type: "number" },
      ],
    },
    token
  );

  await ensureCollection(
    {
      name: "tasks",
      type: "base",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "description", type: "editor" },
        { name: "list", type: "relation", collectionId: lists.id, required: true },
        { name: "attachment", type: "file" },
        { name: "dueDate", type: "date" },
      ],
    },
    token
  );

  console.log("\nAll collections ensured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});