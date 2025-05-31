import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const auth = getAuth();

export async function showLoginForm() {
  const loginContainer = document.getElementById('login-container');
  if (!loginContainer) {
    console.error('找不到 login-container 元素');
    return;
  }

  // 渲染登入表單
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">管理員登入</h2>
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

  // 綁定登入按鈕事件
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) {
    console.error('找不到 login-btn 元素');
    return;
  }

  loginBtn.addEventListener('click', async () => {
    console.log('登入按鈕被點擊'); // 調試日誌
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      alert('請輸入電子郵件和密碼');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('登入成功'); // 調試日誌
      // onAuthStateChanged 會處理後續頁面切換
    } catch (error) {
      console.error('登入失敗:', error);
      alert(`登入失敗: ${error.message}`);
    }
  });

  // 綁定其他按鈕事件
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
    showRegisterForm();
  });
}

// 其他函數（假設未修改）
function showRegisterForm() {
  // 實現註冊表單（可參考之前的 device_binding_flow.js）
  console.log('顯示註冊表單');
}

function showForgotPasswordForm() {
  // 實現忘記密碼表單（可參考之前的 device_binding_flow.js）
  console.log('顯示忘記密碼表單');
}

export async function generateDeviceFingerprint() {
  // 假設已實現
  return 'dummy-fingerprint';
}

export async function checkUserDeviceBinding(userId, deviceFingerprint) {
  // 假設已實現
  return { bound: true };
}

export function initializeAuthFlow() {
  // 假設已實現
}
