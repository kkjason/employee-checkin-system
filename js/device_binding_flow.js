// 裝置綁定與 Google 登入流程設計

// 1. 初始化 Firebase Auth
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut 
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
const provider = new GoogleAuthProvider();

// 2. 裝置指紋生成函數
async function generateDeviceFingerprint() {
  // 收集裝置資訊
  const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const browserInfo = navigator.userAgent;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  // 使用 Canvas 指紋技術
  const canvasFingerprint = await createCanvasFingerprint();
  
  // 組合並雜湊這些資訊
  const combinedInfo = screenInfo + browserInfo + timeZone + language + canvasFingerprint;
  return await hashString(combinedInfo);
}

// Canvas 指紋技術
async function createCanvasFingerprint() {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // 繪製一些圖形和文字，這些會因為不同裝置的渲染引擎而有微小差異
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Hello, world!", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("DeviceFingerprint", 4, 45);
  
  // 繪製一些圖形
  ctx.strokeStyle = "#FF0000";
  ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
  ctx.stroke();
  
  // 獲取 canvas 的 base64 編碼
  return canvas.toDataURL();
}

// 雜湊函數
async function hashString(str) {
  // 使用 SubtleCrypto API 進行 SHA-256 雜湊
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // 將 ArrayBuffer 轉換為十六進制字串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 3. 檢查用戶是否已綁定裝置
async function checkUserDeviceBinding(userId, deviceFingerprint) {
  try {
    // 檢查用戶是否存在
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { bound: false, reason: 'user_not_found' };
    }
    
    const userData = userDoc.data();
    
    // 檢查裝置是否已綁定到該用戶
    if (userData.deviceFingerprints && userData.deviceFingerprints.includes(deviceFingerprint)) {
      return { 
        bound: true, 
        userData: userData 
      };
    }
    
    // 檢查裝置是否已綁定到其他用戶
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

// 4. 綁定用戶與裝置
async function bindUserToDevice(userId, userEmail, displayName, deviceFingerprint) {
  try {
    // 更新用戶資料，添加裝置指紋
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // 用戶已存在，更新裝置列表
      const userData = userDoc.data();
      const deviceFingerprints = userData.deviceFingerprints || [];
      
      if (!deviceFingerprints.includes(deviceFingerprint)) {
        deviceFingerprints.push(deviceFingerprint);
        await updateDoc(userRef, {
          deviceFingerprints: deviceFingerprints,
          lastLogin: new Date()
        });
      }
    } else {
      // 創建新用戶
      await setDoc(userRef, {
        displayName: displayName,
        email: userEmail,
        deviceFingerprints: [deviceFingerprint],
        createdAt: new Date(),
        lastLogin: new Date()
      });
    }
    
    // 更新裝置資料
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

// 5. 首次登入流程
async function handleFirstTimeLogin(user) {
  // 顯示首次登入表單
  const loginContainer = document.getElementById('login-container');
  loginContainer.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4">首次登入設定</h2>
      <p class="mb-4">請確認您的員工資訊：</p>
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-1">Google 帳號</label>
          <input type="text" id="user-email" class="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" value="${user.email}" disabled>
        </div>
        <div>
          <label class="block text-gray-700 mb-1">員工姓名</label>
          <input type="text" id="user-name" class="w-full p-2 border border-gray-300 rounded-lg" value="${user.displayName || ''}" placeholder="請輸入您的姓名">
        </div>
        <div>
          <label class="block text-gray-700 mb-1">工作地點</label>
          <select id="user-location" class="w-full p-2 border border-gray-300 rounded-lg">
            <option value="宏匯">宏匯</option>
          </select>
        </div>
        <div class="mt-2">
          <label class="flex items-center">
            <input type="checkbox" id="binding-agreement" class="mr-2">
            <span>我同意將此裝置綁定至我的帳號，並且了解每個裝置只能綁定一個員工帳號</span>
          </label>
        </div>
        <button id="complete-binding-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:bg-gray-400" disabled>完成綁定</button>
        <button id="cancel-binding-btn" class="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors duration-200">取消</button>
      </div>
    </div>
  `;
  
  // 綁定事件
  const agreementCheckbox = document.getElementById('binding-agreement');
  const completeBindingBtn = document.getElementById('complete-binding-btn');
  
  agreementCheckbox.addEventListener('change', () => {
    completeBindingBtn.disabled = !agreementCheckbox.checked;
  });
  
  completeBindingBtn.addEventListener('click', async () => {
    const userName = document.getElementById('user-name').value.trim();
    const userLocation = document.getElementById('user-location').value;
    
    if (!userName) {
      alert('請輸入您的姓名');
      return;
    }
    
    // 生成裝置指紋
    const deviceFingerprint = await generateDeviceFingerprint();
    
    // 綁定用戶與裝置
    const bindResult = await bindUserToDevice(user.uid, user.email, userName, deviceFingerprint);
    
    if (bindResult.success) {
      // 儲存用戶資訊到本地儲存
      localStorage.setItem('userDisplayName', userName);
      localStorage.setItem('userLocation', userLocation);
      
      // 重新載入頁面，進入打卡流程
      window.location.reload();
    } else {
      alert(`綁定失敗: ${bindResult.error}`);
    }
  });
  
  document.getElementById('cancel-binding-btn').addEventListener('click', () => {
    // 登出並重新載入頁面
    signOut(auth).then(() => {
      window.location.reload();
    });
  });
}

// 6. 主要登入流程
async function initializeAuthFlow() {
  // 檢查用戶是否已登入
  onAuthStateChanged(auth, async (user) => {
    const loginContainer = document.getElementById('login-container');
    const checkinSection = document.getElementById('checkin-section');
    
    if (user) {
      // 用戶已登入
      console.log('用戶已登入:', user);
      
      // 生成裝置指紋
      const deviceFingerprint = await generateDeviceFingerprint();
      
      // 檢查裝置綁定狀態
      const bindingStatus = await checkUserDeviceBinding(user.uid, deviceFingerprint);
      
      if (bindingStatus.bound) {
        // 裝置已綁定，顯示打卡介面
        loginContainer.classList.add('hidden');
        checkinSection.classList.remove('hidden');
        
        // 自動填入員工姓名並鎖定
        const nameInput = document.getElementById('name');
        nameInput.value = bindingStatus.userData.displayName;
        nameInput.disabled = true;
        
        // 可以選擇性地自動填入地點
        if (localStorage.getItem('userLocation')) {
          const locationSelect = document.getElementById('location');
          locationSelect.value = localStorage.getItem('userLocation');
        }
      } else if (bindingStatus.reason === 'device_bound_to_other_user') {
        // 裝置已綁定到其他用戶
        loginContainer.innerHTML = `
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold text-red-600 mb-4">裝置綁定衝突</h2>
            <p class="mb-4">此裝置已綁定到其他員工帳號，無法使用您的帳號登入。</p>
            <p class="mb-4">請聯絡管理員解除綁定，或使用您的專屬裝置登入。</p>
            <button id="logout-btn" class="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors duration-200">登出</button>
          </div>
        `;
        
        document.getElementById('logout-btn').addEventListener('click', () => {
          signOut(auth).then(() => {
            window.location.reload();
          });
        });
        
        checkinSection.classList.add('hidden');
      } else if (bindingStatus.reason === 'not_bound' || bindingStatus.reason === 'user_not_found') {
        // 用戶未綁定，顯示首次登入流程
        handleFirstTimeLogin(user);
        checkinSection.classList.add('hidden');
      } else {
        // 發生錯誤
        loginContainer.innerHTML = `
          <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-2xl font-bold text-red-600 mb-4">發生錯誤</h2>
            <p class="mb-4">檢查裝置綁定時發生錯誤: ${bindingStatus.error}</p>
            <button id="retry-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">重試</button>
            <button id="logout-btn" class="w-full bg-gray-200 text-gray-700 p-3 mt-2 rounded-lg hover:bg-gray-300 transition-colors duration-200">登出</button>
          </div>
        `;
        
        document.getElementById('retry-btn').addEventListener('click', () => {
          window.location.reload();
        });
        
        document.getElementById('logout-btn').addEventListener('click', () => {
          signOut(auth).then(() => {
            window.location.reload();
          });
        });
        
        checkinSection.classList.add('hidden');
      }
    } else {
      // 用戶未登入，顯示登入按鈕
      loginContainer.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg">
          <h2 class="text-2xl font-bold text-indigo-700 mb-4">員工打卡系統</h2>
          <p class="mb-4">請使用您的 Google 帳號登入：</p>
          <button id="google-login-btn" class="w-full bg-white border border-gray-300 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="w-6 h-6 mr-2">
            <span>使用 Google 帳號登入</span>
          </button>
        </div>
      `;
      
      document.getElementById('google-login-btn').addEventListener('click', () => {
        signInWithPopup(auth, provider)
          .catch((error) => {
            console.error('Google 登入失敗:', error);
            alert(`登入失敗: ${error.message}`);
          });
      });
      
      checkinSection.classList.add('hidden');
    }
  });
}

// 導出函數供 HTML 使用
export { initializeAuthFlow };
