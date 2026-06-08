import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

/** 與 Brainless 共用 brainless-schedule 專案；僅讀 publicMenu/current */
export const firebaseConfig = {
  apiKey: 'AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8',
  authDomain: 'brainless-schedule.firebaseapp.com',
  projectId: 'brainless-schedule',
  storageBucket: 'brainless-schedule.firebasestorage.app',
  messagingSenderId: '902167883215',
  appId: '1:902167883215:web:8dfc400a1035929c5bf6ba',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
