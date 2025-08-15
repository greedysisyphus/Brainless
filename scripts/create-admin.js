// 管理員帳號創建腳本
// 使用方法：node scripts/create-admin.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHzCLGD1E8mrp-iVaJ1P1t9cHe5QT8LN8",
  authDomain: "brainless-schedule.firebaseapp.com",
  projectId: "brainless-schedule",
  storageBucket: "brainless-schedule.appspot.com",
  messagingSenderId: "902167883215",
  appId: "1:902167883215:web:8dfc400a1035929c5bf6ba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminAccount(email, password) {
  try {
    console.log('正在創建管理員帳號...');
    
    // 創建用戶
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('用戶創建成功，UID:', user.uid);
    
    // 添加到管理員集合
    await setDoc(doc(db, 'admins', user.uid), {
      email: email,
      role: 'admin',
      permissions: ['catSpeech', 'globalSettings'],
      createdAt: serverTimestamp()
    });
    
    console.log('管理員權限設定成功！');
    console.log('管理員信箱:', email);
    console.log('管理員 UID:', user.uid);
    
    return user;
  } catch (error) {
    console.error('創建管理員帳號失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.log('使用方法: node scripts/create-admin.js <email> <password>');
    console.log('例如: node scripts/create-admin.js admin@example.com mypassword123');
    process.exit(1);
  }
  
  createAdminAccount(email, password)
    .then(() => {
      console.log('管理員帳號創建完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('創建失敗:', error);
      process.exit(1);
    });
}

export { createAdminAccount };
