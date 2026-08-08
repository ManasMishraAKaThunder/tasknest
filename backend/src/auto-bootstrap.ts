// @ts-ignore
import { login } from "../scripts/auth-helper";

const AUTHED = "@request.auth.id != ''";

async function getCollectionByName(base: string, name: string, token: string) {
  const res = await fetch(`${base}/api/collections/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return res.json();
}

async function createCollection(base: string, body: any, token: string) {
  const res = await fetch(`${base}/api/collections`, {
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

async function ensureCollection(base: string, body: any, token: string) {
  const existing = await getCollectionByName(base, body.name, token);
  if (existing) return existing;
  return createCollection(base, body, token);
}

async function setRules(base: string, name: string, rules: any, token: string) {
  const existing = await getCollectionByName(base, name, token);
  if (!existing) return;

  await fetch(`${base}/api/collections/${existing.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rules),
  });
}

export async function autoBootstrap(port: number) {
  const BASE = `http://127.0.0.1:${port}`;
  try {
    const token = await login(BASE);

    const users = await ensureCollection(
      BASE,
      { name: "users", type: "auth", fields: [{ name: "displayName", type: "text" }] },
      token
    );

    const workspaces = await ensureCollection(
      BASE,
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
      BASE,
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
      BASE,
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
      BASE,
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
      BASE,
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

    // Apply collection rules (users.createRule = "" allows public registration)
    await setRules(
      BASE,
      "users",
      {
        listRule: AUTHED,
        viewRule: AUTHED,
        createRule: "", // Empty string = Public registration enabled
        updateRule: AUTHED,
        deleteRule: AUTHED,
      },
      token
    );

    await setRules(
      BASE,
      "workspaces",
      { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED },
      token
    );

    await setRules(
      BASE,
      "workspace_members",
      { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED },
      token
    );

    await setRules(
      BASE,
      "boards",
      { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED },
      token
    );

    await setRules(
      BASE,
      "lists",
      { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED },
      token
    );

    await setRules(
      BASE,
      "tasks",
      { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED },
      token
    );

    console.log("✓ TaskNest backend auto-bootstrap complete.");
  } catch (err: any) {
    console.error("Auto-bootstrap warning:", err?.message || err);
  }
}
