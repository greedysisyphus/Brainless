const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 定義接送地點
const PICKUP_LOCATIONS = {
  "A21環北站": ["A45-余盛煌 Noah 店長", "A51-蕭弘業 Eric 副店長", "A88-沈恩廷 Lydia 咖啡師"],
  "7-11高萱門市": ["A89-林渭麟 Jovi 咖啡師", "A102-張敏涵 Roxie 咖啡師"],
  "桃園高鐵站": ["A93-陳世芬 Nina 咖啡師"],
};

// 判斷是否為早班
const isMorningShift = (shift) => {
  if (!shift) return false;
  return shift.includes("4:30-13:00") || shift.includes("國-4:30-13:00");
};

// 暫時註釋掉未使用的函數
/*
const calculatePickupStats = (scheduleData, tomorrow) => {
  const dayOffset = tomorrow.getDate() - 1;
  const stats = {};

  // 遍歷每個接送地點
  Object.entries(PICKUP_LOCATIONS).forEach(([location, staffIds]) => {
    const count = staffIds.filter((staffId) => {
      const shifts = scheduleData[staffId];
      if (!shifts || !shifts[dayOffset]) return false;
      return isMorningShift(shifts[dayOffset]);
    }).length;

    if (count > 0) {
      stats[location] = count;
    }
  });

  return stats;
};
*/

// API endpoint
exports.getTomorrowPickup = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  try {
    // 使用台灣時區
    const now = new Date();
    const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const tomorrow = new Date(taiwanTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;
    const dayOffset = tomorrow.getDate(); // 日期對應到 cells 的索引

    console.log("Date debug:", {
      now: now.toISOString(),
      taiwanTime: taiwanTime.toISOString(),
      tomorrow: tomorrow.toISOString(),
      dateStr,
      dayOffset
    });

    // 獲取最新的班表數據
    const scheduleRef = await admin.firestore()
        .collection("schedules")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    if (scheduleRef.empty) {
      return res.json({
        text: `${dateStr} 搭車統計\n\n尚無班表資料`,
      });
    }

    const scheduleData = scheduleRef.docs[0].data();
    const rows = scheduleData.scheduleData.rows;
    
    // 建立員工ID到班表的映射
    const staffSchedules = {};
    rows.slice(2).forEach(row => {
      const staffId = row.cells[0].value;
      const shift = row.cells[dayOffset].value;
      staffSchedules[staffId] = shift;
    });

    // 計算各站點搭車人數
    const stats = {};
    Object.entries(PICKUP_LOCATIONS).forEach(([location, staffIds]) => {
      const count = staffIds.filter(staffId => {
        const shift = staffSchedules[staffId];
        return isMorningShift(shift);
      }).length;

      if (count > 0) {
        stats[location] = count;
      }
    });

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return res.json({
        text: `${dateStr} 搭車統計\n\n明天無人需要搭車，謝謝`,
      });
    }

    // 生成文字內容
    const text = `${dateStr} 搭車統計\n\n${
      Object.entries(stats)
          .map(([location, count]) => `${location} ${count} 人`)
          .join("\n")
    }\n\n共${total}人，謝謝`;

    return res.json({text});

  } catch (error) {
    console.error("=== Error in getTomorrowPickup ===");
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({error: "發生錯誤"});
  }
});
