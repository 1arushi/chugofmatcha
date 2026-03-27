/**
 * Vercel serverless: POST { email, code } — sends password reset email via Resend.
 * Set RESEND_API_KEY in Vercel project env (not VITE_*).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = body?.code != null ? String(body.code).trim() : "";

  if (!email || !code) {
    res.status(400).json({ error: "Missing email or code" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Email not configured" });
    return;
  }

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your chugofmatcha password reset code",
        html: `<p>Your password reset code is:</p><p style="font-size:22px;font-weight:700;letter-spacing:0.2em;">${escapeHtml(code)}</p><p style="color:#666;font-size:13px;">If you didn’t request this, you can ignore this email.</p>`,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(r.status || 502).json({ error: data.message || data.error || "Resend error" });
      return;
    }

    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: "Failed to send email" });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
