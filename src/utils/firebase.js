import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.firebasestorage.app",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
};

// 檢查是否已經初始化
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

export const db = getFirestore(firebaseApp);

// 添加一個初始化檢查函數
export async function checkFirebaseConnection() {
  try {
    const testDoc = await getDocs(collection(db, 'schedules'), limit(1));
    console.log('Firebase 連接成功');
    return true;
  } catch (error) {
    console.error('Firebase 連接失敗:', error);
    return false;
  }
} 