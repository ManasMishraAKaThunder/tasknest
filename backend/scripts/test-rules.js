require("dotenv/config");

const BASE = `http://localhost:${process.env.PORT || 8090}`;

async function adminLogin() {
  const res = await fetch(`${BASE}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  return (await res.json()).token;
}

async function registerUser(email, password) {
  const res = await fetch(`${BASE}/api/collections/users/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, passwordConfirm: password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`register ${email} failed: ${JSON.stringify(data)}`);
  return data;
}

async function userLogin(email, password) {
  const res = await fetch(`${BASE}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`login ${email} failed: ${JSON.stringify(data)}`);
  return data.token;
}

async function create(collection, body, token) {
  const res = await fetch(`${BASE}/api/collections/${collection}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`create ${collection} failed: ${JSON.stringify(data)}`);
  return data;
}

async function list(collection, token) {
  const res = await fetch(`${BASE}/api/collections/${collection}/records`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  const ts = Date.now();
  const alice = await registerUser(`alice_${ts}@test.com`, "password123");
  const bob = await registerUser(`bob_${ts}@test.com`, "password123");

  const aliceToken = await userLogin(`alice_${ts}@test.com`, "password123");
  const bobToken = await userLogin(`bob_${ts}@test.com`, "password123");

  console.log("✓ alice and bob created and logged in");

  const workspace = await create("workspaces", { name: "Alice's Workspace", owner: alice.id }, aliceToken);
  console.log(`✓ alice created workspace ${workspace.id}`);

  const board = await create("boards", { name: "Alice's Board", workspace: workspace.id }, aliceToken);
  console.log(`✓ alice created board ${board.id}`);

  const aliceList = await list("boards", aliceToken);
  console.log(`Alice sees ${aliceList.data.items?.length ?? 0} board(s) (expected: 1)`);

  const bobList = await list("boards", bobToken);
  console.log(`Bob sees ${bobList.data.items?.length ?? 0} board(s) (expected: 0)`);

  if (bobList.data.items?.length > 0) {
    console.log("\n🔴 RULE ENFORCEMENT FAILED — Bob can see Alice's private board!");
  } else {
    console.log("\n✅ Rule enforcement working — Bob correctly sees nothing.");
  }
}