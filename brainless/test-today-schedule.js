// 測試今天的班表資料
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8",
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.appspot.com",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testTodaySchedule() {
  try {
    console.log('開始測試今天的班表資料...');
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    
    console.log(`今天日期: ${currentYear}-${currentMonth}-${todayDate}`);
    
    // 獲取當月班表
    const currentMonthDoc = await getDoc(doc(db, 'schedule', 'currentMonth'));
    
    if (currentMonthDoc.exists()) {
      const scheduleData = currentMonthDoc.data();
      console.log('班表資料鍵:', Object.keys(scheduleData));
      
      // 檢查每個員工今天的班次
      for (const [employeeId, schedule] of Object.entries(scheduleData)) {
        if (employeeId === '_lastUpdated') continue;
        
        console.log(`\n員工 ${employeeId}:`);
        if (schedule && typeof schedule === 'object') {
          const todayShift = schedule[todayDate];
          console.log(`  今天 (${todayDate}) 的班次: ${todayShift || '無班次'}`);
          
          // 顯示這個月的所有班次
          console.log('  這個月的班次:');
          for (const [date, shift] of Object.entries(schedule)) {
            if (parseInt(date) === todayDate) {
              console.log(`    ${date}: ${shift} (今天)`);
            } else {
              console.log(`    ${date}: ${shift}`);
            }
          }
        }
      }
    } else {
      console.log('沒有找到當月班表資料');
    }
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testTodaySchedule();
