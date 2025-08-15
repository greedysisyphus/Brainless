// 測試 Firebase 班表資料
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

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

async function testScheduleData() {
  try {
    console.log('開始測試班表資料...');
    
    // 檢查 schedule 集合中的所有文檔
    const scheduleSnapshot = await getDocs(collection(db, 'schedule'));
    console.log('schedule 集合中的文檔數量:', scheduleSnapshot.size);
    
    scheduleSnapshot.forEach((doc) => {
      console.log(`文檔 ID: ${doc.id}, 存在: ${doc.exists()}`);
      if (doc.exists()) {
        const data = doc.data();
        console.log(`文檔 ${doc.id} 的鍵:`, Object.keys(data));
      }
    });
    
    // 檢查 names 集合
    const namesSnapshot = await getDocs(collection(db, 'names'));
    console.log('names 集合中的文檔數量:', namesSnapshot.size);
    
    namesSnapshot.forEach((doc) => {
      console.log(`姓名文檔 ID: ${doc.id}, 資料:`, doc.data());
    });
    
    // 檢查 catSpeech 集合
    const catSpeechSnapshot = await getDocs(collection(db, 'catSpeech'));
    console.log('catSpeech 集合中的文檔數量:', catSpeechSnapshot.size);
    
    catSpeechSnapshot.forEach((doc) => {
      console.log(`catSpeech 文檔 ID: ${doc.id}, 存在: ${doc.exists()}`);
    });
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

testScheduleData();
