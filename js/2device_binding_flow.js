import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, OAuthProvider } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// 多語言翻譯
const translations = {
  zh: {
    title: '員工打卡系統 (2)',
    emailLabel: '電子郵件',
    emailPlaceholder: '請輸入您的電子郵件',
    passwordLabel: '密碼',
    passwordPlaceholder: '請輸入您的密碼',
    loginBtn: '輸入',
    forgotPassword: '忘記密碼？',
    noAccount: '尚未有帳號？',
    registerBtn: '註冊新帳號',
    googleLoginBtn: '使用 Google 帳號登入',
    appleLoginBtn: '使用 Apple 帳號登入',
    registerTitle: '註冊新帳號',
    registerSubmit: '提交註冊',
    backToLogin: '返回輸入',
    emptyFields: '請輸入電子郵件、密碼和姓名',
    emptyEmail: '請輸入電子郵件',
    emptyName: '請輸入姓名',
    loginFailed: '輸入失敗',
    passwordResetSent: '密碼重設輸入已發送',
    passwordResetFailed: '密碼重設失敗',
    registerFailed: '註冊失敗',
    registerSuccess: '註冊成功，請輸入',
    nameLabel: '姓名',
    namePlaceholder: '請輸入您的姓名',
    setNameTitle: '設定您的姓名',
    setNameSubmit: '提交姓名',
    checkinTitle: '員工打卡系統 (2)',
    checkinHeader: '打卡',
    locationLabel: '地點',
    locationOption: '宏匯',
    checkinBtn: '上班打卡',
    checkoutBtn: '下班打卡',
    logoutBtn: '登出',
    emptyLocation: '請選擇地點',
    ipError: '無法獲取您的 IP 地址，請檢查網絡',
    wifiError: '請連接到餐廳WIFI',
    checkinSuccess: '上班打卡成功',
    checkoutSuccess: '下班打卡成功',
    checkinFailed: '打卡失敗',
    logoutFailed: '登出失敗',
    nameNotFound: '未找到註冊姓名，請聯繫管理員',
    error: '錯誤'
  },
  vi: {
    title: 'Đăng nhập hệ thống chấm công nhân viên (2)',
    emailLabel: 'Email',
    emailPlaceholder: 'Vui lòng nhập email của bạn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Vui lòng nhập mật khẩu',
    loginBtn: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    noAccount: 'Chưa có tài khoản?',
    registerBtn: 'Đăng ký tài khoản mới',
    googleLoginBtn: 'Đăng nhập bằng tài khoản Google',
    appleLoginBtn: 'Đăng nhập bằng tài khoản Apple',
    registerTitle: 'Đăng ký tài khoản mới',
    registerSubmit: 'Gửi đăng ký',
    backToLogin: 'Quay lại đăng nhập',
    emptyFields: 'Vui lòng nhập email, mật khẩu và tên',
    emptyEmail: 'Vui lòng nhập email',
    emptyName: 'Vui lòng nhập tên',
    loginFailed: 'Đăng nhập thất bại',
    passwordResetSent: 'Email đặt lại mật khẩu đã được gửi',
    passwordResetFailed: 'Đặt lại mật khẩu thất bại',
    registerFailed: 'Đăng ký thất bại',
    registerSuccess: 'Đăng ký thành công, vui lòng đăng nhập',
    nameLabel: 'Tên',
    namePlaceholder: 'Vui lòng nhập tên của bạn',
    setNameTitle: 'Thiết lập tên của bạn',
    setNameSubmit: 'Gửi tên',
    checkinTitle: 'Hệ thống chấm công nhân viên (2)',
    checkinHeader: 'Chấm công',
    locationLabel: 'Địa điểm',
    locationOption: 'Hong Hui',
    checkinBtn: 'Chấm công bắt đầu',
    checkoutBtn: 'Chấm công kết thúc',
    logoutBtn: 'Đăng xuất',
    emptyLocation: 'Vui lòng chọn địa điểm',
    ipError: 'Không thể lấy địa chỉ IP của bạn, vui lòng kiểm tra mạng',
    wifiError: 'Vui lòng kết nối với WIFI của nhà hàng',
    checkinSuccess: 'Chấm công bắt đầu thành công',
    checkoutSuccess: 'Chấm công kết thúc thành công',
    checkinFailed: 'Chấm công thất bại',
    logoutFailed: 'Đăng xuất thất bại',
    nameNotFound: 'Không tìm thấy tên đã đăng ký, vui lòng liên hệ quản trị viên',
    error: 'Lỗi'
  },
  en: {
    title: 'Employee Check-in System Login (2)',
    emailLabel: 'Email',
    emailPlaceholder: 'Please enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Please enter your password',
    loginBtn: 'Login',
    forgotPassword: 'Forgot password?',
    noAccount: 'Don’t have an account?',
    registerBtn: 'Register new account',
    googleLoginBtn: 'Sign in with Google',
    appleLoginBtn: 'Sign in with Apple',
    registerTitle: 'Register New Account',
    registerSubmit: 'Submit Registration',
    backToLogin: 'Back to Login',
    emptyFields: 'Please enter email, password, and name',
    emptyEmail: 'Please enter email',
    emptyName: 'Please enter your name',
    loginFailed: 'Login failed',
    passwordResetSent: 'Password reset email sent',
    passwordResetFailed: 'Password reset failed',
    registerFailed: 'Registration failed',
    registerSuccess: 'Registration successful, please login',
    nameLabel: 'Name',
    namePlaceholder: 'Please enter your name',
    setNameTitle: 'Set Your Name',
    setNameSubmit: 'Submit Name',
    checkinTitle: 'Employee Check-in System (2)',
    checkinHeader: 'Check-in',
    locationLabel: 'Location',
    locationOption: 'Hong Hui',
    checkinBtn: 'Check-in',
    checkoutBtn: 'Check-out',
    logoutBtn: 'Logout',
    emptyLocation: 'Please select a location',
    ipError: 'Unable to retrieve your IP address, please check your network',
    wifiError: 'Please connect to the restaurant WIFI',
    checkinSuccess: 'Check-in successful',
    checkoutSuccess: 'Check-out successful',
    checkinFailed: 'Check-in failed',
    logoutFailed: 'Logout failed',
    nameNotFound: 'Registered name not found, please contact the administrator',
    error: 'Error'
  }
};

// 導出翻譯函數
export function getTranslations(lang) {
  return translations[lang] || translations.zh;
}

// 獲取用戶姓名
export async function getUserName(db, userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().name;
    }
    return null;
  } catch (error) {
    console.error('獲取用戶姓名失敗:', error);
    return null;
  }
}

// 顯示姓名輸入表單
export async function showNameInputForm(auth, db, userId, lang = 'zh') {
  const loginContainer = document.getElementById('login-container');
  const t = translations[lang];

  loginContainer.innerHTML = `
    <div class="flex justify-center mb-4">
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'zh' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="zh">中文</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'vi' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="vi">Tiếng Việt</button>
      <button class="lang-btn px-4 py-2 mx-1 rounded-lg ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}" data-lang="en">English</button>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${t.setNameTitle}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${t.nameLabel}</label>
          <input type="text" id="set-name" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.namePlaceholder}">
        </div>
        <button id="set-name-submit-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${t.setNameSubmit}</button>
      </div>
    </div>
  `;

  // 語言切換事件
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newLang = btn.dataset.lang;
      localStorage.setItem('language', newLang);
      showNameInputForm(auth, db, userId, newLang);
    });
  });

  document.getElementById('set-name-submit-btn').addEventListener('click', async () => {
    const name = document.getElementById('set-name').value.trim();

    if (!name) {
      showAlert({
        zh: t.emptyName,
        vi: translations.vi.emptyName,
        en: translations.en.emptyName
      });
      return;
    }

    try {
      await setDoc(doc(db, 'users', userId), { name });
      showAlert({
        zh: t.registerSuccess,
        vi: translations.vi.registerSuccess,
        en: translations.en.registerSuccess
      });
      window.location.reload();
    } catch (error) {
      console.error('設定姓名失敗:', error);
      showAlert({
        zh: `${t.error}: ${error.message}`,
        vi: `${translations.vi.error}: ${error.message}`,
        en: `${translations.en.error}: ${error.message}`
      });
    }
  });
}

export async function showLoginForm(auth, db, lang = 'zh') {
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
        <button id="google-login-btn" class="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors duration-200">${t.googleLoginBtn}</button>
        <button id="apple-login-btn" class="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition-colors duration-200">${t.appleLoginBtn}</button>
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
      showLoginForm(auth, db, newLang);
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

  document.getElementById('google-login-btn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('Google 登入成功:', user);
      const userName = await getUserName(db, user.uid);
      if (!userName) {
        showNameInputForm(auth, db, user.uid, lang);
      }
    } catch (error) {
      console.error('Google 登入失敗:', error);
      showAlert({
        zh: `${t.loginFailed}: ${error.message}`,
        vi: `${translations.vi.loginFailed}: ${error.message}`,
        en: `${translations.en.loginFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('apple-login-btn').addEventListener('click', async () => {
    const provider = new OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('Apple 登入成功:', user);
      const userName = await getUserName(db, user.uid);
      if (!userName) {
        showNameInputForm(auth, db, user.uid, lang);
      }
    } catch (error) {
      console.error('Apple 登入失敗:', error);
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
    showRegisterForm(auth, db, lang);
  });
}

export async function showRegisterForm(auth, db, lang = 'zh') {
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
        <div>
          <label class="block text-gray-700 mb-1">${t.nameLabel}</label>
          <input type="text" id="register-name" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="${t.namePlaceholder}">
        </div>
        <button id="register-submit-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${t.registerSubmit}</button>
        <button id="google-register-btn" class="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors duration-200">${t.googleLoginBtn}</button>
        <button id="apple-register-btn" class="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition-colors duration-200">${t.appleLoginBtn}</button>
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
      showRegisterForm(auth, db, newLang);
    });
  });

  document.getElementById('register-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const name = document.getElementById('register-name').value.trim();

    if (!email || !password || !name) {
      showAlert({
        zh: t.emptyFields,
        vi: translations.vi.emptyFields,
        en: translations.en.emptyFields
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      await setDoc(doc(db, 'users', userId), { name });
      showAlert({
        zh: t.registerSuccess,
        vi: translations.vi.registerSuccess,
        en: translations.en.registerSuccess
      });
      showLoginForm(auth, db, lang);
    } catch (error) {
      console.error('註冊失敗:', error);
      showAlert({
        zh: `${t.registerFailed}: ${error.message}`,
        vi: `${translations.vi.registerFailed}: ${error.message}`,
        en: `${translations.en.registerFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('google-register-btn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('Google 註冊成功:', user);
      const userName = await getUserName(db, user.uid);
      if (!userName) {
        showNameInputForm(auth, db, user.uid, lang);
      }
    } catch (error) {
      console.error('Google 註冊失敗:', error);
      showAlert({
        zh: `${t.registerFailed}: ${error.message}`,
        vi: `${translations.vi.registerFailed}: ${error.message}`,
        en: `${translations.en.registerFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('apple-register-btn').addEventListener('click', async () => {
    const provider = new OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('Apple 註冊成功:', user);
      const userName = await getUserName(db, user.uid);
      if (!userName) {
        showNameInputForm(auth, db, user.uid, lang);
      }
    } catch (error) {
      console.error('Apple 註冊失敗:', error);
      showAlert({
        zh: `${t.registerFailed}: ${error.message}`,
        vi: `${translations.vi.registerFailed}: ${error.message}`,
        en: `${translations.en.registerFailed}: ${error.message}`
      });
    }
  });

  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    showLoginForm(auth, db, lang);
  });
}

export function showForgotPasswordForm(auth) {
  console.log('顯示忘記密碼表單');
}

export async function generateDeviceFingerprint() {
  // 獲取使用者的設備資訊
  const parser = new UAParser();
  const result = parser.getResult();
  
  // 獲取設備資訊
  const deviceInfo = `${result.device.vendor || 'Unknown'} ${result.device.model || 'Unknown'}`;
  const osInfo = `${result.os.name || 'Unknown'} ${result.os.version || 'Unknown'}`;
  
  return `${deviceInfo} (${osInfo})`; // 返回設備和操作系統資訊
}

export async function checkUserDeviceBinding(userId, deviceFingerprint) {
  return { bound: true };
}

export function initializeAuthFlow() {
}

function showAlert(messages) {
  const alertModal = document.getElementById('alert-modal');
  const alertMessage = document.getElementById('alert-message');
  if (!alertModal || !alertMessage) {
    console.error('找不到 alert-modal 或 alert-message');
    return;
  }
  alertMessage.innerHTML = `
    <p>${messages.en}</p>
    <p>${messages.zh}</p>
    <p>${messages.vi}</p>
  `;
  alertModal.style.display = 'flex';
}
