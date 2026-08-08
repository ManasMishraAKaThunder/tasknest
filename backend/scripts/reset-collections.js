require("dotenv/config");
const { login } = require("./auth-helper");

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 8090}`;

async function deleteCollection(name, token) {
  const res = await fetch(`${BASE}/api/collections/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    console.log(`  ${name}: not found, skipping`);
    return;
  }
  const col = await res.json();
  const delRes = await fetch(`${BASE}/api/collections/${col.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (delRes.ok) {
    console.log(`  ${name}: deleted`);
  } else {
    const err = await delRes.json().catch(() => ({}));
    console.log(`  ${name}: delete failed — ${JSON.stringify(err)}`);
  }
}

(async () => {
  const token = await login(BASE);
  console.log("Deleting collections in reverse dependency order...");
  // Delete in reverse dependency order: tasks → lists → boards → workspace_members → workspaces
  // (users is auth collection, keep it)
  await deleteCollection("tasks", token);
  await deleteCollection("lists", token);
  await deleteCollection("boards", token);
  await deleteCollection("workspace_members", token);
  await deleteCollection("workspaces", token);
  console.log("\nDone. Now run: node scripts/setup-collections.js && node scripts/setup-rules.js");
})();
