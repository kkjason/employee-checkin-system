import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCv1ywEy0oaL8FNBLAEO-Ban5lMs26Y_gY",
  authDomain: "employee-checkin-system.firebaseapp.com",
  projectId: "employee-checkin-system",
  storageBucket: "employee-checkin-system.firebasestorage.app",
  messagingSenderId: "646412258577",
  appId: "1:646412258577:web:7f32d3c069c415c9b190b0"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 硬編碼的管理員 UID 清單（與 2admin.js 保持一致）
const ADMIN_UIDS = ['YOUR_ADMIN_UID_HERE']; // 請填入您的管理員 UID

// DOM 元素
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// 檢查用戶是否已登入
onAuthStateChanged(auth, (user) => {
  if (user && ADMIN_UIDS.includes(user.uid)) {
    console.log('管理員已登入:', user.email);
    window.location.href = '/2admin.html';
  } else if (user) {
    console.log('非管理員用戶:', user.email);
    errorMessage.textContent = '無管理員權限，請使用管理員帳號登入';
    errorMessage.classList.remove('hidden');
  }
});

// 登入按鈕事件
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorMessage.textContent = '請輸入電子郵件和密碼';
    errorMessage.classList.remove('hidden');
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('登入成功:', user.email);
    if (ADMIN_UIDS.includes(user.uid)) {
      window.location.href = '/2admin.html';
    } else {
      errorMessage.textContent = '無管理員權限，請使用管理員帳號登入';
      errorMessage.classList.remove('hidden');
      await signOut(auth); // 非管理員登出
    }
  } catch (error) {
    console.error('登入失敗:', error);
    let message = '登入失敗: ';
    switch (error.code) {
      case 'auth/invalid-email':
        message += '無效的電子郵件格式';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message += '電子郵件或密碼錯誤';
        break;
      default:
        message += error.message;
    }
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }
});
