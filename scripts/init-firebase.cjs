// Firebase 初始化腳本
// 用於建立班表管理工具所需的資料結構

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

// 範例同仁資料
const sampleEmployees = [
  { id: 'A45', name: '林小余', location: '7-11 新街門市' },
  { id: 'A51', name: '黃紅葉', location: 'A21 環北站' },
  { id: 'A60', name: '李Ashley', location: '不搭車' },
  { id: 'A88', name: '沈恩廷 Lydia', location: '7-11 高萱門市' },
  { id: 'A93', name: 'Nina', location: 'A18 桃園高鐵站' },
  { id: 'A102', name: 'Roxie', location: 'A16 橫山站' }
];

// 範例班表資料
const sampleSchedule = {
  'A45': {
    '1': 'L',
    '2': 'L', 
    '3': 'L',
    '4': 'Y',
    '5': '月休',
    '6': 'Y',
    '24': 'R',
    '25': 'K',
    '31': '月休'
  },
  'A51': {
    '1': 'K',
    '2': 'K',
    '3': 'Y',
    '4': 'L',
    '5': 'K',
    '6': 'Y'
  },
  'A60': {
    '1': 'Y',
    '2': 'L',
    '3': 'K',
    '4': 'Y',
    '5': 'L',
    '6': 'K',
    '22': 'KK',
    '23': 'YY'
  }
};

async function initializeFirebase() {
  try {
    console.log('開始初始化 Firebase 資料...');

    // 1. 建立 schedule 集合
    console.log('建立 schedule 集合...');
    await setDoc(doc(db, 'schedule', 'currentMonth'), {
      _lastUpdated: new Date().toISOString(),
      ...sampleSchedule
    });
    
    await setDoc(doc(db, 'schedule', 'nextMonth'), {
      _lastUpdated: new Date().toISOString()
    });

    // 2. 建立 names 集合
    console.log('建立 names 集合...');
    for (const employee of sampleEmployees) {
      await setDoc(doc(db, 'names', employee.id), {
        name: employee.name
      });
    }

    // 3. 建立 pickupLocations 集合
    console.log('建立 pickupLocations 集合...');
    for (const employee of sampleEmployees) {
      await setDoc(doc(db, 'pickupLocations', employee.id), {
        location: employee.location
      });
    }

    console.log('✅ Firebase 初始化完成！');
    console.log('已建立的資料：');
    console.log('- schedule/currentMonth (包含範例班表)');
    console.log('- schedule/nextMonth (空白)');
    console.log('- names (同仁姓名)');
    console.log('- pickupLocations (上車地點)');
    
  } catch (error) {
    console.error('❌ 初始化失敗:', error);
  }
}

// 執行初始化
initializeFirebase(); 