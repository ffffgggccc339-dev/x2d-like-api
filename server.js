
const express = require("express");
const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "X2D E-SPORTS Like API",
    status: "online"
  });
});

app.post("/like", (req, res) => {
  const uid = String(req.body?.uid ?? "").trim();

  if (!/^\d{6,20}$/.test(uid)) {
    return res.status(400).json({
      success: false,
      message: "Valid UID required"
    });
  }

  return res.status(501).json({
    success: false,
    uid,
    likesSent: 0,
    message: "Like provider not connected yet"
  });
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("X2D API started on port " + port);
});
