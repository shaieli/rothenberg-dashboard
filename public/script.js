// script.js
// ------------------------------------------------------
// קרוסלה (מטעינה אוטומטית קבצים מהשרת),
// החלפת מסכים, חדשות YNET (מרקיזה רציפה כפולה),
// ונתוני ייצור חשמל (גרף+רשימה).
// PDF מוצג ב-iframe – אין שימוש ב-PDF.js.
// ------------------------------------------------------

let carbonChart; // מופע הגרף הגלובלי (לעדכונים)

/* ===========================
   קרוסלת תמונות מהשרת (Auto)
   =========================== */
async function initCarousel() {
  const carousel = document.getElementById("carousel");
  if (!carousel) return;

  try {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    const images = data.files || [];

    if (!images.length) {
      carousel.innerHTML = "<p style='color:white;text-align:center'>אין תמונות בגלריה</p>";
      return;
    }

    // יצירת IMG לכל תמונה שהשרת החזיר
    images.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "תמונת גלריה";
      if (i === 0) img.classList.add("active");
      carousel.appendChild(img);
    });

    const imgs = carousel.querySelectorAll("img");
    if (!imgs.length) return;

    let idx = 0;
    setInterval(() => {
      imgs[idx].classList.remove("active");
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add("active");
    }, 5000); // כל 5 שניות תמונה הבאה

  } catch (err) {
    console.error("Gallery Load Error:", err);
    carousel.innerHTML = "<p style='color:white;text-align:center'>שגיאה בטעינת גלריה</p>";
  }
}

/* ===========================
   החלפת מסכים כל 60 שניות
   =========================== */
function initSections() {
  const s1 = document.getElementById("section1");
  const s2 = document.getElementById("section2");
  if (!s1 || !s2) return;

  setInterval(() => {
    s1.classList.toggle("active");
    s2.classList.toggle("active");
  }, 60000);
}

/* ===========================
   חדשות YNET – מרקיזה רציפה
   =========================== */

/** מצב גלובלי למרקיזה */
const newsTickerState = {
  rafId: null,
  speed: 80,           // פיקסלים לשנייה (כוונון מהירות)
  gap: 60,             // רווח בין רצועה לרצועה
  t1: { el: null, x: 0, w: 0 },
  t2: { el: null, x: 0, w: 0 },
  containerW: 0,
  lastTs: 0
};

/** בניית HTML של הכותרות */
function buildNewsHtml(items) {
  const links = items.map(it => {
    const title = escapeHtml(it.title || "");
    const link  = it.link || "#";
    return `<a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  });
  return links.join("");
}

/** אתחול המרקיזה: מציב שתי רצועות זו אחרי זו ומתחיל אנימציה */
function initNewsTicker(html) {
  const c = document.getElementById("news-container");
  const t1 = document.getElementById("news-track1");
  const t2 = document.getElementById("news-track2");
  if (!c || !t1 || !t2) return;

  // עצירת אנימציה קודמת (אם רצה)
  if (newsTickerState.rafId) cancelAnimationFrame(newsTickerState.rafId);
  newsTickerState.lastTs = 0;

  // הזרקת תוכן זהה לשתי הרצועות
  t1.innerHTML = html;
  t2.innerHTML = html;

  newsTickerState.containerW = c.clientWidth;
  newsTickerState.t1.el = t1;
  newsTickerState.t2.el = t2;

  // לוודא שהתוכן ארוך מהרוחב – אחרת נכפיל אותו עד שיעבור את המסך
  function ensureMinWidth(trackEl) {
    let content = trackEl.innerHTML;
    trackEl.style.transform = "translateX(0px)"; // איפוס רגעי
    let w = trackEl.scrollWidth;
    while (w < newsTickerState.containerW + newsTickerState.gap) {
      content += content;         // שכפול התוכן
      trackEl.innerHTML = content;
      w = trackEl.scrollWidth;
    }
    return trackEl.scrollWidth;
  }

  const w1 = ensureMinWidth(t1);
  const w2 = ensureMinWidth(t2);

  // נקודות התחלה: רצועה 1 בנקודה 0; רצועה 2 מימין לה
  newsTickerState.t1.x = 0;
  newsTickerState.t1.w = w1;
  newsTickerState.t2.x = w1 + newsTickerState.gap;
  newsTickerState.t2.w = w2;

  // לולאת האנימציה
  const step = (ts) => {
    if (!newsTickerState.lastTs) newsTickerState.lastTs = ts;
    const dt = (ts - newsTickerState.lastTs) / 1000; // שניות
    newsTickerState.lastTs = ts;

    const dx = newsTickerState.speed * dt;

    // הזזה שמאלה
    newsTickerState.t1.x -= dx;
    newsTickerState.t2.x -= dx;

    // אם רצועה יצאה לגמרי משמאל – מקפיצים לימין אחרי השנייה
    if (newsTickerState.t1.x + newsTickerState.t1.w < 0) {
      newsTickerState.t1.x = newsTickerState.t2.x + newsTickerState.t2.w + newsTickerState.gap;
      newsTickerState.t1.w = newsTickerState.t1.el.scrollWidth;
    }
    if (newsTickerState.t2.x + newsTickerState.t2.w < 0) {
      newsTickerState.t2.x = newsTickerState.t1.x + newsTickerState.t1.w + newsTickerState.gap;
      newsTickerState.t2.w = newsTickerState.t2.el.scrollWidth;
    }

    newsTickerState.t1.el.style.transform =
      `translateX(${newsTickerState.t1.x}px) translateY(-50%)`;
    newsTickerState.t2.el.style.transform =
      `translateX(${newsTickerState.t2.x}px) translateY(-50%)`;

    newsTickerState.rafId = requestAnimationFrame(step);
  };

  newsTickerState.rafId = requestAnimationFrame(step);

  // רספונסיביות: שינוי גודל חלון -> אתחול מחדש ברכות
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => initNewsTicker(html), 150);
  }, { passive: true });
}

/** טוען YNET RSS מהשרת, בונה HTML, ומרענן את המרקיזה */
async function loadNews() {
  try {
    const res = await fetch("/api/news", { cache: "no-store" });
    const txt = await res.text();
    const xml = new DOMParser().parseFromString(txt, "text/xml");

    // לוקחים עד 25 פריטים, ממפים ל-title+link
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 25).map(it => ({
      title: it.querySelector("title")?.textContent || "",
      link : it.querySelector("link")?.textContent  || "#"
    }));

    const html = buildNewsHtml(items);
    initNewsTicker(html);
  } catch (e) {
    console.error("News error:", e);
    const t1 = document.getElementById("news-track1");
    if (t1) t1.textContent = "שגיאה בטעינת חדשות.";
  }
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

/* =======================================
   מיפוי שמות מקורות לשמות בעברית
   ======================================= */
const SOURCE_LABELS_HE = {
  gas: "גז",
  coal: "פחם",
  solar: "שמש",
  wind: "רוח",
  hydro: "הידרו",
  biomass: "ביומסה",
  nuclear: "גרעיני",
  oil: "נפט",
  geothermal: "גיאותרמי",
  unknown: "לא מסווג",
  "battery discharge": "סוללות (פריקה)",
  "battery charge": "סוללות (טעינה)"
};

/* =======================================
   נתוני ייצור חשמל: גרף עוגה + רשימה
   ======================================= */
async function loadCarbon() {
  try {
    const res = await fetch("/api/carbon", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    const mixRaw = data.powerProductionBreakdown || data.production || {};
    const entries = Object.entries(mixRaw)
      .filter(([, mw]) => typeof mw === "number" && mw > 0.01);

    const totalMW = entries.reduce((sum, [, mw]) => sum + mw, 0);
    entries.sort((a, b) => b[1] - a[1]);

    const labels = entries.map(([key]) => SOURCE_LABELS_HE[key] || key);
    const values = entries.map(([, mw]) => +mw.toFixed(2));
    const pcts   = entries.map(([, mw]) => totalMW ? (mw / totalMW * 100) : 0);

    const ctx = document.getElementById("carbon-chart").getContext("2d");
    const colors = [
      "#1565c0","#42a5f5","#81d4fa","#b3e5fc",
      "#66bb6a","#ffcc80","#ff7043","#8e44ad","#26c6da","#ef5350"
    ];

    if (carbonChart) {
      carbonChart.data.labels = labels.map((l,i) => `${l} (${pcts[i].toFixed(1)}%)`);
      carbonChart.data.datasets[0].data = values;
      carbonChart.update();
    } else {
      carbonChart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: labels.map((l,i) => `${l} (${pcts[i].toFixed(1)}%)`),
          datasets: [{ data: values, backgroundColor: colors }]
        },
        options: {
          plugins: {
            legend: { position: "right", labels: { color: "#003366", font: { size: 14 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const mw  = ctx.parsed;
                  const pct = pcts[ctx.dataIndex] || 0;
                  return ` ${labels[ctx.dataIndex]}: ${mw} MW (${pct.toFixed(1)}%)`;
                }
              }
            }
          }
        }
      });
    }

    const list = document.getElementById("carbon-list");
    list.innerHTML = entries.map(([key, mw]) => {
      const name = SOURCE_LABELS_HE[key] || key;
      const pct  = totalMW ? (mw / totalMW * 100) : 0;
      return `<li>
        <span class="label">${name}</span>
        <span class="value">${mw.toFixed(1)} MW <span class="pct-badge">${pct.toFixed(1)}%</span></span>
      </li>`;
    }).join("");

  } catch (e) {
    console.error("Carbon error:", e);
    const list = document.getElementById("carbon-list");
    if (list) list.innerHTML = `<li>שגיאה בטעינת נתוני ייצור חשמל.</li>`;
  }
}

/* ===========================
   אתחול כללי
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  initCarousel();         // קרוסלה אוטומטית מהשרת
  initSections();         // החלפת מסכים כל 60 שניות
  loadNews();             // התחלת מבזקי החדשות
  loadCarbon();           // טעינת נתוני ייצור חשמל

  // רענון חדשות ונתוני ייצור
  setInterval(loadNews, 30000);   // חדשות כל 30 שניות
  setInterval(loadCarbon, 60000); // נתוני ייצור כל דקה

  // 🔁 רענון כל הדף כל 10 דקות (600,000 מילישניות)
  setInterval(() => {
    window.location.reload();
  }, 10 * 60 * 1000);
});

