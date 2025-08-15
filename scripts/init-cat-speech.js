// 初始化貓咪對話設定腳本
// 使用方法：node scripts/init-cat-speech.js

import { initializeApp } from 'firebase/app';
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
const db = getFirestore(app);

async function initCatSpeech() {
  try {
    console.log('正在初始化貓咪對話設定...');
    
    // 設定初始的全域對話設定
    await setDoc(doc(db, 'catSpeech', 'global'), {
      enabled: false,  // 預設關閉
      texts: [
        '喵～歡迎來到 Brainless！',
        '今天天氣真好呢！',
        '工作加油！',
        '記得休息一下喔～'
      ],
      intervalSeconds: 4,  // 預設4秒間隔
      style: {
        fontSize: '18px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: '#6366f1'
      },
      createdAt: serverTimestamp(),
      updatedBy: 'system'
    });
    
    console.log('貓咪對話設定初始化成功！');
    console.log('預設狀態：關閉');
    console.log('預設對話：4條');
    console.log('- 喵～歡迎來到 Brainless！');
    console.log('- 今天天氣真好呢！');
    console.log('- 工作加油！');
    console.log('- 記得休息一下喔～');
    console.log('預設輪播間隔：4秒');
    
  } catch (error) {
    console.error('初始化失敗:', error);
    throw error;
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  initCatSpeech()
    .then(() => {
      console.log('初始化完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失敗:', error);
      process.exit(1);
    });
}

export { initCatSpeech };
