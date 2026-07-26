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
  const token = await login();
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
