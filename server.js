// server.js
// ------------------------------------------------------
// שרת Express שמגיש את הפרונט-אנד (public/)
// ומספק API-ים:
// 1) /api/news    -> מחזיר את RSS של YNET (XML) כדי לעקוף CORS.
// 2) /api/carbon  -> מחזיר פירוט ייצור החשמל לפי מקורות מ-ElectricityMaps.
// 3) /api/gallery -> מחזיר רשימת קבצי תמונה מתיקיית /public/images/gallery
// שימוש ב-fetch המובנה של Node 18+ (אין צורך ב-node-fetch).
// ------------------------------------------------------

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname ב-ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// הגשת קבצים סטטיים מהתיקייה public
app.use(express.static(path.join(__dirname, "public")));

// ----- API חדשות (YNET) - מחזיר XML גולמי של RSS -----
app.get("/api/news", async (req, res) => {
  try {
    const rssUrl = "https://www.ynet.co.il/Integration/StoryRss1854.xml";
    const r = await fetch(rssUrl, { cache: "no-store" });
    if (!r.ok) throw new Error("YNET RSS error: " + r.status);
    const xml = await r.text();
    res.type("text/xml").send(xml);
  } catch (err) {
    console.error("News error:", err);
    res.status(500).send("Error fetching news");
  }
});

// ----- API ייצור חשמל לפי מקורות (ElectricityMaps) -----
app.get("/api/carbon", async (req, res) => {
  try {
    const url = "https://api.electricitymaps.com/v3/power-breakdown/latest?zone=IL";
    // אפשר להגדיר טוקן כסביבתי ELECTRICITYMAPS_TOKEN; אם לא - נשתמש בזה שסיפקת:
    const token = process.env.ELECTRICITYMAPS_TOKEN || "0Bht7qWWw4kmtsYNKYuD";

    const r = await fetch(url, {
      headers: { "auth-token": token },
      cache: "no-store"
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("ElectricityMaps error:", r.status, txt);
      return res.status(502).json({ error: "Bad response", status: r.status });
    }

    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Carbon error:", err);
    res.status(500).json({ error: "Failed fetching power breakdown" });
  }
});

// ----- API גלריית תמונות – מחזיר את כל קבצי התמונה בתיקיית gallery -----
app.get("/api/gallery", (req, res) => {
  try {
    const dir = path.join(__dirname, "public", "images", "gallery");

    // אם התיקייה לא קיימת – נחזיר רשימה ריקה (לא שגיאה קשה)
    if (!fs.existsSync(dir)) {
      return res.json({ files: [] });
    }

    // קריאת כל הקבצים בתיקייה
    const files = fs.readdirSync(dir).filter((f) =>
      f.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    // מחזירים URL יחסי שכל דפדפן יכול לטעון
    res.json({
      files: files.map((f) => `/images/gallery/${f}`)
    });
  } catch (err) {
    console.error("Gallery error:", err);
    res.status(500).json({ error: "Failed to read gallery folder" });
  }
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});