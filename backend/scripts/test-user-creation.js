const BASE = process.env.API_URL || "https://tasknest-k7d3.onrender.com";

async function testUserCreation() {
  console.log(`Testing user creation on ${BASE}...`);
  for (let i = 1; i <= 5; i++) {
    const email = `testuser_bulk_${Date.now()}_${i}@example.com`;
    const res = await fetch(`${BASE}/api/collections/users/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "password123",
        passwordConfirm: "password123",
        displayName: `Bulk User ${i}`,
      }),
    });
    const data = await res.json();
    if (res.ok && data.record) {
      console.log(`✓ User ${i} created: ID = ${data.record.id}, Email = ${data.record.email}`);
    } else {
      console.error(`✗ User ${i} failed:`, data);
    }
  }
}

testUserCreation();
