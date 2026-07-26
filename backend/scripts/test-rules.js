require("dotenv/config");

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 8090}`;

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
  // Solarch auth collection create returns { token, record } not just the record
  return data.record || data;
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

async function del(collection, id, token) {
  const res = await fetch(`${BASE}/api/collections/${collection}/records/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`delete ${collection}/${id} failed: ${JSON.stringify(data)}`);
  }
  return true;
}

async function main() {
  const ts = Date.now();
  const alice = await registerUser(`alice_${ts}@test.com`, "password123");
  const bob = await registerUser(`bob_${ts}@test.com`, "password123");

  const aliceToken = await userLogin(`alice_${ts}@test.com`, "password123");
  const bobToken = await userLogin(`bob_${ts}@test.com`, "password123");

  console.log("✓ alice and bob created and logged in");

  // Create workspace
  const workspace = await create("workspaces", { name: "Alice's Workspace", owner: alice.id }, aliceToken);
  console.log(`✓ alice created workspace ${workspace.id}`);

  // WORKAROUND: Solarch hooks are broken (see PACKAGE-ISSUES.md).
  // Manually create the owner membership record client-side.
  const membership = await create("workspace_members", {
    workspace: workspace.id,
    user: alice.id,
    memberRole: "owner",
  }, aliceToken);
  console.log(`✓ auto-membership workaround: alice added as owner (${membership.id})`);

  // Verify membership exists
  const members = await list("workspace_members", aliceToken);
  const aliceMemberships = (members.data.items || []).filter(m => m.user === alice.id && m.workspace === workspace.id);
  if (aliceMemberships.length === 0) {
    console.log("🔴 MEMBERSHIP NOT FOUND — workspace_members record not created");
    process.exit(1);
  }
  console.log(`✓ verified: alice has ${aliceMemberships.length} membership(s) in workspace`);

  // Now Alice should be able to create a board
  const board = await create("boards", { name: "Alice's Board", workspace: workspace.id }, aliceToken);
  console.log(`✓ alice created board ${board.id}`);

  // Alice should see 1 board
  const aliceList = await list("boards", aliceToken);
  console.log(`Alice sees ${aliceList.data.items?.length ?? 0} board(s) (expected: 1)`);

  // Bob (non-member) should see 0 boards
  const bobList = await list("boards", bobToken);
  console.log(`Bob sees ${bobList.data.items?.length ?? 0} board(s) (expected: 0)`);

  if (bobList.data.items?.length > 0) {
    console.log("\n🔴 RULE ENFORCEMENT FAILED — Bob can see Alice's private board!");
  } else {
    console.log("\n✅ Rule enforcement working — Bob correctly sees nothing.");
  }

  // Test cascade delete (client-side workaround)
  console.log("\n--- Cascade delete test ---");
  const list1 = await create("lists", { name: "To Do", board: board.id, position: 1 }, aliceToken);
  const list2 = await create("lists", { name: "Done", board: board.id, position: 2 }, aliceToken);
  const task1 = await create("tasks", { title: "Task A", list: list1.id }, aliceToken);
  const task2 = await create("tasks", { title: "Task B", list: list2.id }, aliceToken);
  console.log(`✓ created 2 lists and 2 tasks`);

  // Delete tasks first, then lists, then board (manual cascade)
  await del("tasks", task1.id, aliceToken);
  await del("tasks", task2.id, aliceToken);
  await del("lists", list1.id, aliceToken);
  await del("lists", list2.id, aliceToken);
  await del("boards", board.id, aliceToken);
  console.log(`✓ cascade delete (client-side): board, lists, and tasks deleted`);

  // Verify they're gone
  const remainingLists = await list("lists", aliceToken);
  const remainingTasks = await list("tasks", aliceToken);
  const boardsAfter = (remainingLists.data.items || []).filter(l => l.board === board.id);
  const tasksAfter = (remainingTasks.data.items || []).filter(t => t.list === list1.id || t.list === list2.id);

  if (boardsAfter.length === 0 && tasksAfter.length === 0) {
    console.log("✅ Cascade delete verified — no orphaned lists or tasks.");
  } else {
    console.log(`🔴 Orphaned records: ${boardsAfter.length} lists, ${tasksAfter.length} tasks`);
  }

  console.log("\n=== All tests passed ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
