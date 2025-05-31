import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// 多語言翻譯
const translations = {
  zh: {
    title: '員工打卡系統登入',
    emailLabel: '電子郵件',
    emailPlaceholder: '請輸入您的電子郵件',
    passwordLabel: '密碼',
    passwordPlaceholder: '請輸入密碼',
    loginBtn: '登入',
    forgotPassword: '忘記密碼？',
    noAccount: '還沒有帳號？',
    registerBtn: '註冊新帳號',
    registerTitle: '註冊新帳號',
    registerSubmit: '提交註冊',
    backToLogin: '返回登入',
    emptyFields: '請輸入電子郵件和密碼',
    emptyEmail: '請輸入電子郵件',
    loginFailed: '登入失敗',
    passwordResetSent: '密碼重設郵件已發送',
    passwordResetFailed: '密碼重設失敗',
    registerFailed: '註冊失敗',
    registerSuccess: '註冊成功，請登入'
  },
  vi: {
    title: 'Đăng nhập hệ thống chấm công nhân viên',
    emailLabel: 'Email',
    emailPlaceholder: 'Vui lòng nhập email của bạn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Vui lòng nhập mật khẩu',
    loginBtn: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    noAccount: 'Chưa có tài khoản?',
    registerBtn: 'Đăng ký tài khoản mới',
    registerTitle: 'Đăng ký tài khoản mới',
    registerSubmit: 'Gửi đăng ký',
    backToLogin: 'Quay lại đăng nhập',
    emptyFields: 'Vui lòng nhập email và mật khẩu',
    emptyEmail: 'Vui lòng nhập email',
    loginFailed: 'Đăng nhập thất bại',
    passwordResetSent: 'Email đặt lại mật khẩu đã được gửi',
    passwordResetFailed: 'Đặt lại mật khẩu thất bại',
    registerFailed: 'Đăng ký thất bại',
    registerSuccess: 'Đăng ký thành công, vui lòng đăng nhập'
  },
  en: {
    title: 'Employee Check-in System Login',
    emailLabel: 'Email',
    emailPlaceholder: 'Please enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Please enter your password',
    loginBtn: 'Login',
    forgotPassword: 'Forgot password?',
    noAccount: 'Don’t have an account?',
    registerBtn: 'Register new account',
    registerTitle: 'Register New Account',
    registerSubmit: 'Submit Registration',
    backToLogin: 'Back to Login',
    emptyFields: 'Please enter email and password',
    emptyEmail: 'Please enter email',
    loginFailed: 'Login failed',
    passwordResetSent: 'Password reset email sent',
    passwordResetFailed: 'Password reset failed',
    registerFailed: 'Registration failed',
    registerSuccess: 'Registration successful, please login'
  }
};

export async function showLoginForm(auth, lang = 'zh') {
  const loginContainer = document.getElementById('login-container');
  if (!loginContainer) {
    console.error('找不到 login-container 元素');
    return;
  }

  const t = translations[lang];

  loginContainer.innerHTML = `
    <div class="flex justify-center mb-4">
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'zh' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="zh">中文</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'vi' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="vi">Tiếng Việt</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="en">English</button>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${t.title}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${t.emailLabel}</label>
          <input type="email" id="login-email" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.emailPlaceholder}">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${t.passwordLabel}</label>
          <input type="password" id="login-password" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.passwordPlaceholder}">
        </div>
        <button id="login-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">${t.loginBtn}</button>
        <div class="text-center">
          <button id="forgot-password-btn" class="text-indigo-600 hover:underline">${t.forgotPassword}</button>
        </div>
        <div class="border-t border-gray-300 pt-4 mt-4">
          <p class="text-center mb-2">${t.noAccount}</p>
          <button id="register-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${t.registerBtn}</button>
        </div>
      </div>
    </div>
  `;

  // 語言切換事件
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newLang = btn.dataset.lang;
      localStorage.setItem('language', newLang);
      showLoginForm(auth, newLang);
    });
  });

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
      showAlert({
        zh: t.emptyFields,
        vi: translations.vi.emptyFields,
        en: translations.en.emptyFields
      });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('登入成功');
    } catch (error) {
      console.error('登入失敗:', error);
      showAlert({
        zh: `${t.loginFailed}: ${error.message}`,
        vi: `${translations.vi.loginFailed}: ${error.message}`,
        en: `${translations.en.loginFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      showAlert({
        zh: t.emptyEmail,
        vi: translations.vi.emptyEmail,
        en: translations.en.emptyEmail
      });
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {
        showAlert({
          zh: t.passwordResetSent,
          vi: translations.vi.passwordResetSent,
          en: translations.en.passwordResetSent
        });
      })
      .catch((error) => {
        showAlert({
          zh: `${t.passwordResetFailed}: ${error.message}`,
          vi: `${translations.vi.passwordResetFailed}: ${error.message}`,
          en: `${translations.en.passwordResetFailed}: ${error.message}`
        });
      });
  });

  document.getElementById('register-btn').addEventListener('click', () => {
    showRegisterForm(auth, lang);
  });
}

function showRegisterForm(auth, lang = 'zh') {
  const loginContainer = document.getElementById('login-container');
  const t = translations[lang];

  loginContainer.innerHTML = `
    <div class="flex justify-center mb-4">
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'zh' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="zh">中文</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'vi' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="vi">Tiếng Việt</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="en">English</button>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${t.registerTitle}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${t.emailLabel}</label>
          <input type="email" id="register-email" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.emailPlaceholder}">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${t.passwordLabel}</label>
          <input type="password" id="register-password" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.passwordPlaceholder}">
        </div>
        <button id="register-submit-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${t.registerSubmit}</button>
        <div class="text-center">
          <button id="back-to-login-btn" class="text-indigo-600 hover:underline">${t.backToLogin}</button>
        </div>
      </div>
    </div>
  `;

  // 語言切換事件
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newLang = btn.dataset.lang;
      localStorage.setItem('language', newLang);
      showRegisterForm(auth, newLang);
    });
  });

  document.getElementById('register-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
      showAlert({
        zh: t.emptyFields,
        vi: translations.vi.emptyFields,
        en: translations.en.emptyFields
      });
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showAlert({
        zh: t.registerSuccess,
        vi: translations.vi.registerSuccess,
        en: translations.en.registerSuccess
      });
      showLoginForm(auth, lang);
    } catch (error) {
      console.error('註冊失敗:', error);
      showAlert({
        zh: `${t.registerFailed}: ${error.message}`,
        vi: `${translations.vi.registerFailed}: ${error.message}`,
        en: `${translations.en.registerFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    showLoginForm(auth, lang);
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

// 提示視窗（與 index.html 共用）
function showAlert(messages) {
  const alertModal = document.getElementById('alert-modal');
  const alertMessage = document.getElementById('alert-message');
  if (!alertModal || !alertMessage) {
    console.error('找不到 alert-modal 或 alert-message');
    return;
  }
  alertMessage.innerHTML = `
    <p>${messages.zh}</p>
    <p>${messages.vi}</p>
    <p>${messages.en}</p>
  `;
  alertModal.style.display = 'flex';
}
