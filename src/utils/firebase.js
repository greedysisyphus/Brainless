import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8",
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.appspot.com",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
};

// 檢查是否已經初始化
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// 啟用離線支持
try {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('離線持久性在多個標籤中失敗');
    } else if (err.code === 'unimplemented') {
      console.warn('當前瀏覽器不支持離線持久性');
    }
  });
} catch (error) {
  console.error('啟用離線功能時出錯:', error);
}

// 添加一個初始化檢查函數
export async function checkFirebaseConnection() {
  try {
    const testDoc = await getDocs(collection(db, 'forecasts'), limit(1));
    console.log('Firebase 連接成功');
    return true;
  } catch (error) {
    console.error('Firebase 連接失敗:', error);
    return false;
  }
}

// 提供一個安全的獲取數據的工具函數
export async function safeGetCollection(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`獲取 ${collectionName} 失敗:`, error);
    return [];
  }
}

// 管理員相關功能
export const checkAdminStatus = async (uid) => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('檢查管理員狀態失敗:', error);
    return false;
  }
};

export const adminLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = await checkAdminStatus(userCredential.user.uid);
    if (!isAdmin) {
      await signOut(auth);
      throw new Error('此帳號沒有管理員權限');
    }
    return userCredential.user;
  } catch (error) {
    console.error('管理員登入失敗:', error);
    throw error;
  }
};

export const adminLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('登出失敗:', error);
  }
}; 