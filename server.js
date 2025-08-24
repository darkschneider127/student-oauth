import express from "express";
import session from "express-session";
import morgan from "morgan";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = "http://localhost:3000/oauth2callback",
  SESSION_SECRET = "dev-secret",
  PORT = 3000
} = process.env;

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false },
  })
);
app.use(express.static("public"));

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

function requireAuth(req, res, next) {
  if (req.session.tokens) return next();
  return res.redirect("/");
}

// Step 1: Login
app.get("/login", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"],
  });
  res.redirect(url);
});

// Step 2: OAuth callback
app.get("/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    req.session.tokens = tokens;
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
    const me = await oauth2.userinfo.get();
    req.session.userinfo = me.data;

    res.redirect("/dashboard.html");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error");
  }
});

// Get current user
app.get("/api/me", (req, res) => {
  res.json({
    authenticated: !!req.session.tokens,
    user: req.session.userinfo || null,
  });
});

// List recent emails
app.get("/api/emails", requireAuth, async (req, res) => {
  try {
    oAuth2Client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const list = await gmail.users.messages.list({ userId: "me", maxResults: 10 });
    const msgs = list.data.messages || [];

    const results = [];
    for (const m of msgs) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });
      results.push({
        id: m.id,
        headers: (msg.data.payload?.headers || []).reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {}),
      });
    }

    res.json({ messages: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
