
const express = require("express");

const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "X2D E-SPORTS Like API",
    status: "online",
    endpoints: {
      player: "POST /player",
      like: "POST /like"
    }
  });
});

// UID যাচাই করে প্লেয়ারের তথ্যের জন্য
// অনুমোদিত Provider API যুক্ত করার প্রস্তুতি
app.post("/player", (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();

  if (!/^\d{6,20}$/.test(uid)) {
    return res.status(400).json({
      success: false,
      message: "Valid Free Fire UID required"
    });
  }

  return res.status(503).json({
    success: false,
    uid,
    message: "Player data provider is not connected yet"
  });
});

// Like provider এখনো সংযুক্ত নয়
app.post("/like", (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();

  if (!/^\d{6,20}$/.test(uid)) {
    return res.status(400).json({
      success: false,
      message: "Valid UID required"
    });
  }

  return res.status(503).json({
    success: false,
    uid,
    likesSent: 0,
    message: "Authorized like provider is not connected"
  });
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("X2D API started on port " + port);
});
