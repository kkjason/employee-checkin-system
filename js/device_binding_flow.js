import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export async function showLoginForm(auth) {
  const loginContainer = document.getElementById('login-container');
  if (!loginContainer) {
    console.error('找不到 login-container 元素');
    return;
  }

  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">員工打卡系統登入</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">電子郵件</label>
          <input type="email" id="login-email" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="請輸入您的電子郵件">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">密碼</label>
          <input type="password" id="login-password" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="請輸入密碼">
        </div>
        <button id="login-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">登入</button>
        <div class="text-center">
          <button id="forgot-password-btn" class="text-indigo-600 hover:underline">忘記密碼？</button>
        </div>
        <div class="border-t border-gray-300 pt-4 mt-4">
          <p class="text-center mb-2">還沒有帳號？</p>
          <button id="register-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">註冊新帳號</button>
        </div>
      </div>
    </div>
  `;

  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) {
    console.error('找不到 login-btn 元素');
    return;
  }

  loginBtn.addEventListener('click', async () => {
    console.log('登入按鈕被點擊');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      alert('請輸入電子郵件和密碼');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('登入成功');
    } catch (error) {
      console.error('登入失敗:', error);
      alert(`登入失敗: ${error.message}`);
    }
  });

  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert('請輸入電子郵件');
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {
        alert('密碼重設郵件已發送');
      })
      .catch((error) => {
        alert(`密碼重設失敗: ${error.message}`);
      });
  });

  document.getElementById('register-btn').addEventListener('click', () => {
    showRegisterForm(auth);
  });
}

function showRegisterForm(auth) {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">註冊新帳號</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">電子郵件</label>
          <input type="email" id="register-email" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="請輸入您的電子郵件">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">密碼</label>
          <input type="password" id="register-password" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="請輸入密碼">
        </div>
        <button id="register-submit-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">提交註冊</button>
        <div class="text-center">
          <button id="back-to-login-btn" class="text-indigo-600 hover:underline">返回登入</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
      alert('請輸入電子郵件和密碼');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('註冊成功，請登入');
      showLoginForm(auth);
    } catch (error) {
      console.error('註冊失敗:', error);
      alert(`註冊失敗: ${error.message}`);
    }
  });

  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    showLoginForm(auth);
  });
}

function showForgotPasswordForm(auth) {
  console.log('顯示忘記密碼表單');
}

export async function generateDeviceFingerprint() {
  return 'dummy-fingerprint';
}

export async function checkUserDeviceBinding(userId, deviceFingerprint) {
  return { bound: true };
}

export function initializeAuthFlow() {
}
