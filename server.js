
const express = require("express");

const app = express();
app.use(express.json({ limit: "10kb" }));

const REGION = "BD";
const MIN_LIKES = 20;
const MAX_LIKES = 100;

// Render Environment Variables
const API_KEYS = (process.env.X2D_API_KEYS || "")
  .split(",")
  .map(key => key.trim())
  .filter(Boolean);

const LIKE_API_URL = process.env.LIKE_API_URL || "";
const LIKE_PROVIDER_KEY = process.env.LIKE_PROVIDER_KEY || "";

// Temporary in-memory limit.
// A server restart clears this data.
const dailyRequests = new Map();

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid ?? "").trim());
}

function authenticate(req, res, next) {
  const key = req.get("x-api-key");

  if (!API_KEYS.length) {
    return res.status(503).json({
      success: false,
      message: "X2D API keys are not configured"
    });
  }

  if (!key || !API_KEYS.includes(key)) {
    return res.status(401).json({
      success: false,
      message: "Invalid or missing API key"
    });
  }

  next();
}

function todayKey(uid) {
  const date = new Date().toISOString().slice(0, 10);
  return `${date}:${uid}`;
}

app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "X2D E-SPORTS Custom Like API",
    status: "online",
    region: REGION,
    minLikes: MIN_LIKES,
    maxLikes: MAX_LIKES,
    dailyLimitPerUID: 1,
    endpoints: ["POST /like", "POST /player"]
  });
});

app.post("/like", authenticate, async (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();
  const likes = Number(req.body?.likes);

  if (!validUid(uid)) {
    return res.status(400).json({
      success: false,
      message: "A valid Free Fire UID is required"
    });
  }

  if (
    !Number.isInteger(likes) ||
    likes < MIN_LIKES ||
    likes > MAX_LIKES
  ) {
    return res.status(400).json({
      success: false,
      message: `Likes must be between ${MIN_LIKES} and ${MAX_LIKES}`
    });
  }

  if (!LIKE_API_URL) {
    return res.status(503).json({
      success: false,
      uid,
      region: REGION,
      requestedLikes: likes,
      likesSent: 0,
      message: "Like provider is not configured; no likes were sent"
    });
  }

  const key = todayKey(uid);

  if (dailyRequests.has(key)) {
    return res.status(429).json({
      success: false,
      uid,
      message: "This UID has already made a request today"
    });
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (LIKE_PROVIDER_KEY) {
      headers.Authorization = `Bearer ${LIKE_PROVIDER_KEY}`;
    }

    const response = await fetch(LIKE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        uid,
        region: REGION,
        likes
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        uid,
        likesSent: 0,
        message: "Like provider rejected the request"
      });
    }

    const result = await response.json();

    // Do not claim success unless the provider explicitly confirms it.
    if (result.success !== true) {
      return res.status(502).json({
        success: false,
        uid,
        likesSent: 0,
        message: "Provider did not confirm successful delivery"
      });
    }

    // Reserve the UID only after confirmed provider success.
    dailyRequests.set(key, Date.now());

    return res.json({
      success: true,
      uid,
      region: REGION,
      requestedLikes: likes,
      providerResult: result,
      message: "Provider confirmed the request"
    });
  } catch (_error) {
    return res.status(502).json({
      success: false,
      uid,
      likesSent: 0,
      message: "Could not connect to the like provider"
    });
  }
});

app.post("/player", authenticate, async (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();

  if (!validUid(uid)) {
    return res.status(400).json({
      success: false,
      message: "A valid Free Fire UID is required"
    });
  }

  return res.status(503).json({
    success: false,
    uid,
    region: REGION,
    message: "Player data provider is not configured"
  });
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("X2D E-SPORTS API started");
});
