// Firebase 連線測試腳本
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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

async function testFirebaseConnection() {
  try {
    console.log('🔍 測試 Firebase 連線...');
    
    // 測試讀取
    console.log('📖 測試讀取操作...');
    const testRead = await getDoc(doc(db, 'schedule', 'currentMonth'));
    if (testRead.exists()) {
      console.log('✅ 讀取測試成功');
    } else {
      console.log('⚠️  currentMonth 文件不存在，但連線正常');
    }
    
    // 測試寫入
    console.log('📝 測試寫入操作...');
    const testData = {
      test: 'connection_test',
      timestamp: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'test', 'connection'), testData);
    console.log('✅ 寫入測試成功');
    
    // 清理測試資料
    console.log('🧹 清理測試資料...');
    await setDoc(doc(db, 'test', 'connection'), {});
    
    console.log('🎉 所有測試通過！Firebase 連線正常');
    
  } catch (error) {
    console.error('❌ Firebase 測試失敗:', error);
    console.error('錯誤代碼:', error.code);
    console.error('錯誤訊息:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('💡 建議：請檢查 Firebase Console 中的安全規則設定');
      console.log('   前往：https://console.firebase.google.com/project/brainless-schedule/firestore/rules');
    }
  }
}

testFirebaseConnection(); 