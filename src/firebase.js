import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8",
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.firebasestorage.app",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 啟用離線持久化
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('離線持久化失敗：多個標籤頁打開');
    } else if (err.code == 'unimplemented') {
      console.log('當前瀏覽器不支持離線持久化');
    }
  });

export { db } 