import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs 
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

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
const db = getFirestore(app);

// 語言翻譯
const translations = {
  zh: {
    title: '員工打卡系統',
    firstTimeTitle: '首次登入設定',
    email: '電子郵件',
    employeeName: '員工姓名',
    location: '工作地點',
    agreement: '我同意將此裝置綁定至我的帳號，並且了解每個裝置只能綁定一個員工帳號',
    completeBinding: '完成綁定',
    cancel: '取消',
    password: '密碼',
    login: '登入',
    forgotPassword: '忘記密碼？',
    noAccount: '還沒有帳號？',
    register: '註冊新帳號',
    registerTitle: '註冊新帳號',
    confirmPassword: '確認密碼',
    backToLogin: '返回登入',
    resetPasswordTitle: '重設密碼',
    resetPasswordDesc: '請輸入您的電子郵件，我們將發送重設密碼的連結給您。',
    sendResetLink: '發送重設連結',
    bindingError: '綁定失敗',
    loginError: '登入失敗',
    registerError: '註冊失敗',
    resetError: '發送失敗',
    resetSuccess: '重設密碼連結已發送到您的電子郵件，請查收',
    deviceConflict: '裝置綁定衝突',
    deviceConflictDesc: '此裝置已綁定到其他員工帳號，無法使用您的帳號登入。',
    contactAdmin: '請聯絡管理員解除綁定，或使用您的專屬裝置登入。',
    logout: '登出',
    error: '發生錯誤',
    errorDesc: '檢查裝置綁定時發生錯誤',
    retry: '重試',
    nameRequired: '請輸入您的姓名',
    emailPasswordRequired: '請輸入電子郵件和密碼',
    passwordMismatch: '兩次輸入的密碼不一致',
    passwordLength: '密碼長度至少需要 6 位',
    emailRequired: '請輸入電子郵件'
  },
  vi: {
    title: 'Hệ thống chấm công nhân viên',
    firstTimeTitle: 'Thiết lập đăng nhập lần đầu',
    email: 'Email',
    employeeName: 'Tên nhân viên',
    location: 'Địa điểm làm việc',
    agreement: 'Tôi đồng ý liên kết thiết bị này với tài khoản của mình và hiểu rằng mỗi thiết bị chỉ có thể liên kết với một tài khoản nhân viên',
    completeBinding: 'Hoàn tất liên kết',
    cancel: 'Hủy',
    password: 'Mật khẩu',
    login: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    noAccount: 'Chưa có tài khoản?',
    register: 'Đăng ký tài khoản mới',
    registerTitle: 'Đăng ký tài khoản mới',
    confirmPassword: 'Xác nhận mật khẩu',
    backToLogin: 'Quay lại đăng nhập',
    resetPasswordTitle: 'Đặt lại mật khẩu',
    resetPasswordDesc: 'Vui lòng nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến bạn.',
    sendResetLink: 'Gửi liên kết đặt lại',
    bindingError: 'Liên kết thất bại',
    loginError: 'Đăng nhập thất bại',
    registerError: 'Đăng ký thất bại',
    resetError: 'Gửi thất bại',
    resetSuccess: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn, vui lòng kiểm tra.',
    deviceConflict: 'Xung đột liên kết thiết bị',
    deviceConflictDesc: 'Thiết bị này đã được liên kết với tài khoản nhân viên khác, không thể đăng nhập bằng tài khoản của bạn.',
    contactAdmin: 'Vui lòng liên hệ quản trị viên để gỡ liên kết, hoặc sử dụng thiết bị riêng của bạn để đăng nhập.',
    logout: 'Đăng xuất',
    error: 'Lỗi xảy ra',
    errorDesc: 'Lỗi khi kiểm tra liên kết thiết bị',
    retry: 'Thử lại',
    nameRequired: 'Vui lòng nhập tên của bạn',
    emailPasswordRequired: 'Vui lòng nhập email và mật khẩu',
    passwordMismatch: 'Mật khẩu nhập lại không khớp',
    passwordLength: 'Mật khẩu phải có ít nhất 6 ký tự',
    emailRequired: 'Vui lòng nhập email'
  },
  en: {
    title: 'Employee Check-in System',
    firstTimeTitle: 'First-Time Login Setup',
    email: 'Email',
    employeeName: 'Employee Name',
    location: 'Work Location',
    agreement: 'I agree to bind this device to my account and understand that each device can only be bound to one employee account',
    completeBinding: 'Complete Binding',
    cancel: 'Cancel',
    password: 'Password',
    login: 'Login',
    forgotPassword: 'Forgot Password?',
    noAccount: 'Don’t have an account?',
    register: 'Register New Account',
    registerTitle: 'Register New Account',
    confirmPassword: 'Confirm Password',
    backToLogin: 'Back to Login',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDesc: 'Please enter your email, and we will send you a password reset link.',
    sendResetLink: 'Send Reset Link',
    bindingError: 'Binding Failed',
    loginError: 'Login Failed',
    registerError: 'Registration Failed',
    resetError: 'Sending Failed',
    resetSuccess: 'Password reset link has been sent to your email, please check.',
    deviceConflict: 'Device Binding Conflict',
    deviceConflictDesc: 'This device is already bound to another employee account and cannot be used to log in with your account.',
    contactAdmin: 'Please contact the administrator to unbind, or use your dedicated device to log in.',
    logout: 'Logout',
    error: 'Error Occurred',
    errorDesc: 'Error while checking device binding',
    retry: 'Retry',
    nameRequired: 'Please enter your name',
    emailPasswordRequired: 'Please enter email and password',
    passwordMismatch: 'Passwords do not match',
    passwordLength: 'Password must be at least 6 characters',
    emailRequired: 'Please enter your email'
  }
};

// 當前語言，預設為中文
let currentLang = localStorage.getItem('lang') || 'zh';

// 更新語言按鈕狀態
function updateLanguageButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('bg-indigo-600', btn.id === `lang-${currentLang}`);
    btn.classList.toggle('text-white', btn.id === `lang-${currentLang}`);
    btn.classList.toggle('bg-gray-200', btn.id !== `lang-${currentLang}`);
    btn.classList.toggle('text-black', btn.id !== `lang-${currentLang}`);
  });
}

// 語言切換處理
function setupLanguageSwitching() {
  document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', () => {
      currentLang = button.id.split('-')[1];
      localStorage.setItem('lang', currentLang);
      updateLanguageButtons();
      // 重新顯示當前表單以更新語言
      const user = auth.currentUser;
      if (user) {
        generateDeviceFingerprint().then(deviceFingerprint => {
          checkUserDeviceBinding(user.uid, deviceFingerprint).then(bindingStatus => {
            if (bindingStatus.bound) {
              // 已綁定，重新載入頁面
              window.location.reload();
            } else if (bindingStatus.reason === 'not_bound' || bindingStatus.reason === 'user_not_found') {
              handleFirstTimeLogin(user);
            } else {
              showErrorForm(bindingStatus);
            }
          });
        });
      } else {
        showLoginForm();
      }
    });
  });
}

// 裝置指紋生成函數
async function generateDeviceFingerprint() {
  const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const browserInfo = navigator.userAgent;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const canvasFingerprint = await createCanvasFingerprint();
  const combinedInfo = screenInfo + browserInfo + timeZone + language + canvasFingerprint;
  return await hashString(combinedInfo);
}

// Canvas 指紋技術
async function createCanvasFingerprint() {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Hello, world!", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("DeviceFingerprint", 4, 45);
  
  ctx.strokeStyle = "#FF0000";
  ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
  ctx.stroke();
  
  return canvas.toDataURL();
}

// 雜湊函數
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 檢查用戶是否已綁定裝置
async function checkUserDeviceBinding(userId, deviceFingerprint) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { bound: false, reason: 'user_not_found' };
    }
    
    const userData = userDoc.data();
    
    if (userData.deviceFingerprints && userData.deviceFingerprints.includes(deviceFingerprint)) {
      return { 
        bound: true, 
        userData: userData 
      };
    }
    
    const deviceRef = doc(db, 'devices', deviceFingerprint);
    const deviceDoc = await getDoc(deviceRef);
    
    if (deviceDoc.exists() && deviceDoc.data().userId !== userId) {
      return { 
        bound: false, 
        reason: 'device_bound_to_other_user',
        boundToUserId: deviceDoc.data().userId 
      };
    }
    
    return { bound: false, reason: 'not_bound' };
  } catch (error) {
    console.error('檢查裝置綁定失敗:', error);
    return { bound: false, reason: 'error', error: error.message };
  }
}

// 綁定用戶與裝置
async function bindUserToDevice(userId, userEmail, displayName, deviceFingerprint) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const deviceFingerprints = userData.deviceFingerprints || [];
      
      if (!deviceFingerprints.includes(deviceFingerprint)) {
        deviceFingerprints.push(deviceFingerprint);
        await updateDoc(userRef, {
          deviceFingerprints: deviceFingerprints,
          lastLogin: new Date()
 Hawkins
        });
      }
    } else {
      await setDoc(userRef, {
        displayName: displayName,
        email: userEmail,
        deviceFingerprints: [deviceFingerprint],
        createdAt: new Date(),
        lastLogin: new Date()
      });
    }
    
    const deviceRef = doc(db, 'devices', deviceFingerprint);
    await setDoc(deviceRef, {
      userId: userId,
      lastUsed: new Date(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenSize: `${screen.width}x${screen.height}`,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('綁定裝置失敗:', error);
    return { success: false, error: error.message };
  }
}

// 首次登入流程
async function handleFirstTimeLogin(user) {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${translations[currentLang].firstTimeTitle}</h2>
      <p class="mb-4">${translations[currentLang].firstTimeTitle}</p>
      <div class="space-y-4">
        <div>
          <label class="block

 text-gray-700 mb-1">${translations[currentLang].email}</label>
          <input type="text" id="user-email" class="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" value="${user.email}" disabled>
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].employeeName}</label>
          <input type="text" id="user-name" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].employeeName}">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].location}</label>
          <select id="user-location" class="w-full p-2 border border-gray-300 rounded-lg">
            <option value="宏匯">宏匯</option>
          </select>
        </div>
        <div class="mt-2">
          <label class="flex items-center">
            <input type="checkbox" id="binding-agreement" class="mr-2">
            <span>${translations[currentLang].agreement}</span>
          </label>
        </div>
        <button id="complete-binding-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:bg-gray-400" disabled>${translations[currentLang].completeBinding}</button>
        <button id="cancel-binding-btn" class="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors duration-200">${translations[currentLang].cancel}</button>
      </div>
    </div>
  `;
  
  const agreementCheckbox = document.getElementById('binding-agreement');
  const completeBindingBtn = document.getElementById('complete-binding-btn');
  
  agreementCheckbox.addEventListener('change', () => {
    completeBindingBtn.disabled = !agreementCheckbox.checked;
  });
  
  completeBindingBtn.addEventListener('click', async () => {
    const userName = document.getElementById('user-name').value.trim();
    const userLocation = document.getElementById('user-location').value;
    
    if (!userName) {
      alert(translations[currentLang].nameRequired);
      return;
    }
    
    const deviceFingerprint = await generateDeviceFingerprint();
    const bindResult = await bindUserToDevice(user.uid, user.email, userName, deviceFingerprint);
    
    if (bindResult.success) {
      localStorage.setItem('userDisplayName', userName);
      localStorage.setItem('userLocation', userLocation);
      window.location.reload();
    } else {
      alert(`${translations[currentLang].bindingError}: ${bindResult.error}`);
    }
  });
  
  document.getElementById('cancel-binding-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.reload();
    });
  });
}

// 顯示登入表單
function showLoginForm() {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${translations[currentLang].title}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].email}</label>
          <input type="email" id="login-email" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].email}">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].password}</label>
          <input type="password" id="login-password" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].password}">
        </div>
        <button id="login-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">${translations[currentLang].login}</button>
        <div class="text-center">
          <button id="forgot-password-btn" class="text-indigo-600 hover:underline">${translations[currentLang].forgotPassword}</button>
        </div>
        <div class="border-t border-gray-300 pt-4 mt-4">
          <p class="text-center mb-2">${translations[currentLang].noAccount}</p>
          <button id="register-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${translations[currentLang].register}</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      alert(translations[currentLang].emailPasswordRequired);
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('登入失敗:', error);
      alert(`${translations[currentLang].loginError}: ${error.message}`);
    }
  });
  
  document.getElementById('register-btn').addEventListener('click', () => {
    showRegisterForm();
  });
  
  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    showForgotPasswordForm();
  });
}

// 顯示註冊表單
function showRegisterForm() {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${translations[currentLang].registerTitle}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].email}</label>
          <input type="email" id="register-email" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].email}">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].password}</label>
          <input type="password" id="register-password" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].password} (6+ characters)">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].confirmPassword}</label>
          <input type="password" id="register-confirm-password" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].confirmPassword}">
        </div>
        <button id="register-submit-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">${translations[currentLang].register}</button>
        <div class="text-center">
          <button id="back-to-login-btn" class="text-indigo-600 hover:underline">${translations[currentLang].backToLogin}</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('register-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!email || !password) {
      alert(translations[currentLang].emailPasswordRequired);
      return;
    }
    
    if (password !== confirmPassword) {
      alert(translations[currentLang].passwordMismatch);
      return;
    }
    
    if (password.length < 6) {
      alert(translations[currentLang].passwordLength);
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('註冊失敗:', error);
      alert(`${translations[currentLang].registerError}: ${error.message}`);
    }
  });
  
  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    showLoginForm();
  });
}

// 顯示忘記密碼表單
function showForgotPasswordForm() {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">${translations[currentLang].resetPasswordTitle}</h2>
      <p class="mb-4">${translations[currentLang].resetPasswordDesc}</p>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">${translations[currentLang].email}</label>
          <input type="email" id="reset-email" class="w-full p-2 border border-gray-300 rounded-lg" placeholder="${translations[currentLang].email}">
        </div>
        <button id="reset-password-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">${translations[currentLang].sendResetLink}</button>
        <div class="text-center">
          <button id="back-to-login-btn" class="text-indigo-600 hover:underline">${translations[currentLang].backToLogin}</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('reset-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value.trim();
    
    if (!email) {
      alert(translations[currentLang].emailRequired);
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      alert(translations[currentLang].resetSuccess);
      showLoginForm();
    } catch (error) {
      console.error('發送重設密碼郵件失敗:', error);
      alert(`${translations[currentLang].resetError}: ${error.message}`);
    }
  });
  
  document.getElementById('back-to-login-btn').addEventListener('click', () => {
    showLoginForm();
  });
}

// 顯示錯誤表單
function showErrorForm(bindingStatus) {
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-red-600 mb-4">${translations[currentLang][bindingStatus.reason === 'device_bound_to_other_user' ? 'deviceConflict' : 'error']}</h2>
      <p class="mb-4">${translations[currentLang][bindingStatus.reason === 'device_bound_to_other_user' ? 'deviceConflictDesc' : 'errorDesc']}: ${bindingStatus.error || ''}</p>
      ${bindingStatus.reason === 'device_bound_to_other_user' ? `
        <p class="mb-4">${translations[currentLang].contactAdmin}</p>
        <button id="logout-btn" class="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors duration-200">${translations[currentLang].logout}</button>
      ` : `
        <button id="retry-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">${translations[currentLang].retry}</button>
        <button id="logout-btn" class="w-full bg-gray-200 text-gray-700 p-3 mt-2 rounded-lg hover:bg-gray-300 transition-colors duration-200">${translations[currentLang].logout}</button>
      `}
    </div>
  `;
  
  if (bindingStatus.reason !== 'device_bound_to_other_user') {
    document.getElementById('retry-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.reload();
    });
  });
}

// 主要登入流程
async function initializeAuthFlow() {
  onAuthStateChanged(auth, async (user) => {
    const loginContainer = document.getElementById('login-container');
    const checkinSection = document.getElementById('checkin-section');
    const appContainer = document.getElementById('app');
    
    updateLanguageButtons();
    setupLanguageSwitching();
    
    if (user) {
      const deviceFingerprint = await generateDeviceFingerprint();
      const bindingStatus = await checkUserDeviceBinding(user.uid, deviceFingerprint);
      
      if (bindingStatus.bound) {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        checkinSection.classList.remove('hidden');
        
        document.getElementById('user-name-display').textContent = bindingStatus.userData.displayName;
        document.getElementById('user-email').textContent = user.email;
        
        const nameInput = document.getElementById('name');
        nameInput.value = bindingStatus.userData.displayName;
        nameInput.disabled = true;
        
        if (localStorage.getItem('userLocation')) {
          const locationSelect = document.getElementById('location');
          locationSelect.value = localStorage.getItem('userLocation');
        }
      } else if (bindingStatus.reason === 'device_bound_to_other_user') {
        loginContainer.innerHTML = `
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold text-red-600 mb-4">${translations[currentLang].deviceConflict}</h2>
            <p class="mb-4">${translations[currentLang].deviceConflictDesc}</p>
            <p class="mb-4">${translations[currentLang].contactAdmin}</p>
            <button id="logout-btn" class="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors duration-200">${translations[currentLang].logout}</button>
          </div>
        `;
        
        document.getElementById('logout-btn').addEventListener('click', () => {
          signOut(auth).then(() => {
            window.location.reload();
          });
        });
        
        appContainer.classList.add('hidden');
        checkinSection.classList.add('hidden');
      } else if (bindingStatus.reason === 'not_bound' || bindingStatus.reason === 'user_not_found') {
        handleFirstTimeLogin(user);
        appContainer.classList.add('hidden');
        checkinSection.classList.add('hidden');
      } else {
        showErrorForm(bindingStatus);
        appContainer.classList.add('hidden');
        checkinSection.classList.add('hidden');
      }
    } else {
      showLoginForm();
      appContainer.classList.add('hidden');
      checkinSection.classList.add('hidden');
    }
  });
}

// 導出函數
export { 
  initializeAuthFlow,
  generateDeviceFingerprint,
  checkUserDeviceBinding
};
