require("dotenv/config");
const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 8090}`;

(async () => {
  // Create a test user
  const ts = Date.now();
  const email = `dbg_${ts}@test.com`;
  const userRes = await fetch(`${BASE}/api/collections/users/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", passwordConfirm: "password123" }),
  });
  const userData = await userRes.json();
  console.log("User response:", JSON.stringify(userData));

  if (!userData.id) {
    console.log("ERROR: User creation did not return an id. Trying login approach...");
  }

  // Login as user to get token and confirm user id
  const loginRes = await fetch(`${BASE}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password: "password123" }),
  });
  const loginData = await loginRes.json();
  const userId = loginData.record?.id;
  const userToken = loginData.token;
  console.log("User ID from login:", userId);

  // Create workspace
  const wsRes = await fetch(`${BASE}/api/collections/workspaces/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ name: "Debug WS", owner: userId }),
  });
  const ws = await wsRes.json();
  console.log("Workspace:", ws.id);

  // Test 1: Send role field (should be stripped by Solarch bug)
  const body1 = { workspace: ws.id, user: userId, role: "owner" };
  console.log("\n--- Test 1: normal body ---");
  console.log("Body:", JSON.stringify(body1));
  const r1 = await fetch(`${BASE}/api/collections/workspace_members/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
    body: JSON.stringify(body1),
  });
  console.log("Status:", r1.status);
  console.log("Response:", JSON.stringify(await r1.json(), null, 2));

  // Test 2: Try without role (confirm workspace+user pass through)
  const body2 = { workspace: ws.id, user: userId };
  console.log("\n--- Test 2: without role ---");
  const r2 = await fetch(`${BASE}/api/collections/workspace_members/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
    body: JSON.stringify(body2),
  });
  console.log("Status:", r2.status);
  console.log("Response:", JSON.stringify(await r2.json(), null, 2));
})();
