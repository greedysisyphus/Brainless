// 檢查 Firebase 中現有的管理員帳號
// 使用方法：node scripts/check-admin.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkAdminAccounts() {
  try {
    console.log('正在檢查 Firebase 中的管理員帳號...\n');
    
    // 查詢 admins collection
    const adminsRef = collection(db, 'admins');
    const snapshot = await getDocs(adminsRef);
    
    if (snapshot.empty) {
      console.log('❌ 沒有找到任何管理員帳號');
      console.log('\n💡 提示：使用以下命令創建管理員帳號：');
      console.log('   node scripts/create-admin.js <email> <password>');
      console.log('   例如：node scripts/create-admin.js admin@example.com mypassword123');
      return;
    }
    
    console.log(`✅ 找到 ${snapshot.size} 個管理員帳號：\n`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`UID: ${doc.id}`);
      console.log(`Email: ${data.email || '未設定'}`);
      console.log(`角色: ${data.role || '未設定'}`);
      console.log(`權限: ${data.permissions ? data.permissions.join(', ') : '未設定'}`);
      if (data.createdAt) {
        const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        console.log(`創建時間: ${createdAt.toLocaleString('zh-TW')}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
    
    console.log('⚠️  注意：此腳本只能查看 Firestore 中的管理員記錄');
    console.log('   實際的登入帳號（email/password）存儲在 Firebase Authentication 中');
    console.log('   如需查看完整的帳號資訊，請前往 Firebase Console：');
    console.log('   https://console.firebase.google.com/project/brainless-schedule/authentication/users');
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    console.error('錯誤詳情:', error.message);
  }
}

// 執行檢查
checkAdminAccounts()
  .then(() => {
    console.log('\n檢查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

