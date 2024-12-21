import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8",
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.firebasestorage.app",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export async function checkFirebaseConnection() {
  try {
    const testDoc = await getDocs(collection(db, 'forecasts'), limit(1))
    console.log('Firebase 連接成功')
    return true
  } catch (error) {
    console.error('Firebase 連接失敗:', error)
    return false
  }
} 