/**
 * 交通車名單 API —— 給 iOS 捷徑 / LINE 用。
 *
 * 算法完全沿用網站那份（functions/lib/shifts 是從 src/pages/shifts 複製過來的），
 * 所以捷徑看到的跟網頁看到的一定一樣。這裡不重寫任何邏輯。
 */
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const PICKUP_API_KEY = defineSecret("PICKUP_API_KEY");

/** 台北時間的今天（YYYY-MM-DD）。伺服器跑在 UTC，直接用 new Date() 會差一天。 */
function taipeiToday(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function resolveDate(raw) {
  const value = String(raw || "today").trim();
  if (value === "today") return taipeiToday(0);
  if (value === "tomorrow") return taipeiToday(1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

exports.pickup = onRequest(
  { region: "us-central1", secrets: [PICKUP_API_KEY], cors: true },
  async (req, res) => {
    // secret 用 CLI 設的時候很容易夾帶結尾換行（echo 就會），兩邊都 trim 才不會白比對
    const expected = String(PICKUP_API_KEY.value() || "").trim();
    const given = String(req.query.key || req.get("x-api-key") || "").trim();
    // 名單有同事姓名，不能像舊的那支一樣裸奔
    if (!expected || given !== expected) {
      res.status(401).type("text/plain; charset=utf-8").send("未授權：網址要帶 ?key=");
      return;
    }

    const from = resolveDate(req.query.date);
    if (!from) {
      res.status(400).type("text/plain; charset=utf-8")
        .send("date 只接受 today / tomorrow / YYYY-MM-DD");
      return;
    }

    const [
      { buildShiftBook, pickupMapFrom },
      { resolveSupportShifts },
      { buildIdentity, applyIdentity },
      { buildPickupTable, renderDriverSchedule, renderPickupText },
      { addDays },
    ] = await Promise.all([
      import("./lib/shifts/shiftModel.js"),
      import("./lib/shifts/shiftSupport.js"),
      import("./lib/shifts/shiftIdentity.js"),
      import("./lib/shifts/shiftExport.js"),
      import("./lib/shifts/shiftModel.js"),
    ]);

    const db = admin.firestore();
    const [monthSnap, peopleSnap, linkSnap] = await Promise.all([
      db.collection("shiftMonths").get(),
      db.collection("shiftPeople").get(),
      db.collection("shiftSupportLinks").get(),
    ]);

    const months = monthSnap.docs.map((d) => d.data());
    const peopleSettings = Object.fromEntries(peopleSnap.docs.map((d) => [d.id, d.data()]));
    const links = linkSnap.docs.flatMap((d) => d.data()?.links || []);

    const identity = buildIdentity(peopleSettings);
    const resolved = resolveSupportShifts(applyIdentity(months, identity), links);
    const book = buildShiftBook(resolved);

    const days = req.query.range === "week" ? 6 : 0;
    const table = buildPickupTable(book, {
      from,
      to: days ? addDays(from, days) : from,
      pickupByPerson: pickupMapFrom(peopleSettings, identity),
    });

    if (req.query.format === "json") {
      res.status(200).json({ from, to: days ? addDays(from, days) : from, table });
      return;
    }

    const forDriver = req.query.audience !== "store";
    const text = forDriver
      ? renderDriverSchedule(table)
      : renderPickupText(table);

    res.status(200).type("text/plain; charset=utf-8")
      .send(text || `${from} 沒有人要坐交通車。`);
  }
);
