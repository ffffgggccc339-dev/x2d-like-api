const express = require("express");

const app = express();
app.use(express.json({ limit: "10kb" }));

const REGION = (process.env.FF_REGION || "BD").toUpperCase();

// Set these in Render Environment only after verifying a provider's
// official documentation and response format.
const PLAYER_API_URL = process.env.PLAYER_API_URL || "";
const PLAYER_API_KEY = process.env.PLAYER_API_KEY || "";
const LIKE_API_URL = process.env.LIKE_API_URL || "";
const LIKE_API_KEY = process.env.LIKE_API_KEY || "";

function validUid(value) {
  return /^\d{6,20}$/.test(String(value ?? "").trim());
}

async function providerRequest(url, apiKey, payload) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { data = { message: "Provider returned a non-JSON response" }; }

  if (!response.ok) {
    const error = new Error(`Provider returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "X2D E-SPORTS API",
    status: "online",
    region: REGION,
    endpoints: ["POST /player", "POST /like"]
  });
});

app.post("/player", async (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();
  const region = String(req.body?.region || REGION).trim().toUpperCase();

  if (!validUid(uid)) {
    return res.status(400).json({
      success: false,
      message: "Valid Free Fire UID required (6–20 digits)"
    });
  }
  if (!/^[A-Z]{2,5}$/.test(region)) {
    return res.status(400).json({ success: false, message: "Invalid region" });
  }
  if (!PLAYER_API_URL) {
    return res.status(503).json({
      success: false,
      uid,
      region,
      message: "Player data provider is not configured yet"
    });
  }

  try {
    const data = await providerRequest(PLAYER_API_URL, PLAYER_API_KEY, { uid, region });
    return res.json({ success: true, uid, region, player: data });
  } catch (_error) {
    return res.status(502).json({
      success: false,
      uid,
      region,
      message: "Player data provider request failed"
    });
  }
});

app.post("/like", async (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();
  const region = String(req.body?.region || REGION).trim().toUpperCase();

  if (!validUid(uid)) {
    return res.status(400).json({
      success: false,
      message: "Valid Free Fire UID required (6–20 digits)"
    });
  }
  if (!/^[A-Z]{2,5}$/.test(region)) {
    return res.status(400).json({ success: false, message: "Invalid region" });
  }
  if (!LIKE_API_URL) {
    return res.status(503).json({
      success: false,
      uid,
      region,
      likesSent: 0,
      message: "Like provider is not configured; no likes were sent"
    });
  }

  try {
    const data = await providerRequest(LIKE_API_URL, LIKE_API_KEY, { uid, region });
    return res.json({ success: true, uid, region, result: data });
  } catch (_error) {
    return res.status(502).json({
      success: false,
      uid,
      region,
      likesSent: 0,
      message: "Like provider request failed"
    });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
  }
  return res.status(500).json({ success: false, message: "Internal server error" });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`X2D E-SPORTS API started on port ${port}; region ${REGION}`);
});
