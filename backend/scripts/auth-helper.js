require("dotenv/config");

const email = process.env.ADMIN_EMAIL || "you@example.com";
const password = process.env.ADMIN_PASSWORD || "yourpassword123";

async function login(base) {
  // 1. Try logging in directly
  try {
    const res = await fetch(`${base}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, password }),
    });
    const data = await res.json();
    if (data.token) {
      return data.token;
    }
  } catch (err) {
    // Continue to check installer
  }

  // 2. If login failed, check if superuser needs to be installed (fresh database on Render)
  try {
    const checkRes = await fetch(`${base}/api/installer/check`);
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData && checkData.installed === false) {
        console.log(`No admin account found on target server. Auto-creating initial admin (${email})...`);
        const installRes = await fetch(`${base}/api/installer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, passwordConfirm: password }),
        });
        const installData = await installRes.json();
        if (installRes.ok) {
          console.log(`✓ Admin account created successfully.`);
          // Retry login after auto-installation
          const retryRes = await fetch(`${base}/api/admins/auth-with-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identity: email, password }),
          });
          const retryData = await retryRes.json();
          if (retryData.token) return retryData.token;
        } else {
          console.warn("Installer failed:", installData);
        }
      }
    }
  } catch (err) {
    console.warn("Installer check error:", err.message);
  }

  throw new Error(
    `Login failed for admin identity '${email}'.\n` +
    `Ensure your ADMIN_EMAIL and ADMIN_PASSWORD in environment/dotenv match the admin account on ${base}.`
  );
}

module.exports = { login, email, password };
