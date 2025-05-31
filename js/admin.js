import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, updateDoc, addDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

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
const db = getFirestore(app); // 確保 Firestore 正確初始化
const auth = getAuth(app); // 確保 Auth 正確初始化

let lastDoc = null;
let firstDoc = null;
let displayMode = 'original';
let currentNameFilter = '';
let currentLocationFilter = '';
let currentPage = 0; // 當前頁碼

// DOM 元素
const ipManagement = document.getElementById('ip-management');
const checkinManagement = document.getElementById('checkin-management');
const ipManagementBtn = document.getElementById('ip-management-btn');
const checkinManagementBtn = document.getElementById('checkin-management-btn');
const logoutBtn = document.getElementById('logout-btn'); // 獲取登出按鈕

// 按鈕事件綁定
ipManagementBtn.addEventListener('click', () => {
  ipManagement.classList.remove('hidden');
  checkinManagement.classList.add('hidden');
  loadIPWhitelist(); // 載入 IP 白名單
});

checkinManagementBtn.addEventListener('click', () => {
  checkinManagement.classList.remove('hidden');
  ipManagement.classList.add('hidden');
  loadCheckinRecords(); // 載入打卡紀錄
});

// 等待 DOM 載入完成
document.addEventListener('DOMContentLoaded', () => {
  // 身份驗證狀態監聽
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('用戶 UID:', user.uid, '電子郵件:', user.email);
      document.getElementById('admin-container').classList.remove('hidden');
      ipManagement.classList.remove('hidden'); // 預設顯示 IP 管理
      checkinManagement.classList.add('hidden');
      await loadIPWhitelist(); // 載入 IP 白名單
    } else {
      console.log('無用戶登入');
      window.location.href = '/index.html'; // 導向登入頁面
    }
  });
});

// 登出按鈕事件
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('登出成功');
    window.location.href = '/index.html'; // 登出後導向登入頁面
  } catch (error) {
    console.error('登出失敗:', error);
    alert('登出失敗: ' + error.message);
  }
});

export async function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  try {
    const querySnapshot = await getDocs(collection(db, 'whitelist')); // 使用正確的 db
    querySnapshot.forEach((doc) => {
      const ip = doc.data().ip;
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center p-2 bg-gray-50 rounded-lg';
      li.innerHTML = `
        <span class="flex-1">${ip}</span>
        <div class="flex space-x-2">
          <button class="text-blue-600 hover:text-blue-800 edit-ip-btn px-2 py-1 border border-blue-600 rounded-lg" data-id="${doc.id}">編輯</button>
          <button class="text-red-600 hover:text-red-800 delete-ip-btn px-2 py-1 border border-red-600 rounded-lg" data-id="${doc.id}">刪除</button>
        </div>
      `;
      ipList.appendChild(li);
    });

    // 綁定刪除按鈕事件
    document.querySelectorAll('.delete-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id; // 確保正確獲取 id
        try {
          await deleteDoc(doc(db, 'whitelist', id)); // 使用正確的 db
          loadIPWhitelist();
        } catch (error) {
          console.error('刪除 IP 失敗:', error);
          alert('刪除失敗: ' + error.message);
        }
      });
    });

    // 綁定編輯按鈕事件
    document.querySelectorAll('.edit-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id; // 確保正確獲取 id
        const newIp = prompt("請輸入新的 IP 位址:", btn.closest('li').querySelector('span').textContent);
        if (newIp) {
          try {
            await updateDoc(doc(db, 'whitelist', id), { ip: newIp }); // 使用正確的 db
            loadIPWhitelist();
          } catch (error) {
            console.error('更新 IP 失敗:', error);
            alert('更新失敗: ' + error.message);
          }
        }
      });
    });
  } catch (error) {
    console.error('載入 IP 白名單失敗:', error);
    if (error.code === 'permission-denied') {
      ipList.innerHTML = `<li class="text-red-600">載入失敗: 權限不足，請確認您是管理員</li>`;
    } else {
      ipList.innerHTML = `<li class="text-red-600">載入失敗: ${error.message}</li>`;
    }
  }
}

export async function loadCheckinRecords(name = '', location = '', direction = '') {
  const checkinRecords = document.getElementById('checkin-records');
  const recordStart = document.getElementById('record-start');
  const recordEnd = document.getElementById('record-end');
  const recordTotal = document.getElementById('record-total');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');

  checkinRecords.innerHTML = '';
  currentNameFilter = name;
  currentLocationFilter = location;

  try {
    let q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(20)); // 使用正確的 db

    // 應用篩選條件
    if (name) {
      q = query(q, where('name', '==', name));
    }
    if (location) {
      q = query(q, where('location', '==', location));
    }

    // 分頁處理
    if (direction === 'next') {
      currentPage++;
      if (currentPage > 0) {
        q = query(q, startAfter(lastDoc));
      }
    } else if (direction === 'prev') {
      currentPage--;
      if (currentPage < 0) {
        currentPage = 0;
      }
      if (currentPage === 0) {
        q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(20)); // 使用正確的 db
      } else {
        q = query(q, startAfter(firstDoc));
      }
    }

    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    // 更新分頁狀態
    if (records.length > 0) {
      lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstDoc = querySnapshot.docs[0];
    } else {
      lastDoc = null;
      firstDoc = null;
    }

    // 總記錄數（近似估計，可能需要額外查詢）
    const totalQuery = query(collection(db, 'checkins'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalRecords = totalSnapshot.size;

    // 顯示記錄
    if (displayMode === 'original') {
      records.forEach(record => {
        const row = document.createElement('tr'); // 確保在這裡創建 row
        const checkinTime = new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${record.type === 'checkin' ? `${checkinTime}<br>${record.device}` : '-'}</td>
          <td class="py-3 px-4 border-b">${record.type === 'checkout' ? `${checkinTime}<br>${record.device}` : '-'}</td>
        `;
        checkinRecords.appendChild(row);
      });
    } else {
      // 配對模式邏輯
      const pairedRecords = pairCheckinRecords(records);
      pairedRecords.forEach(record => {
        const checkinTime = record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-';
        const checkoutTime = record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-';
        const checkinDevice = record.checkin ? record.checkin.device : '-';
        const checkoutDevice = record.checkout ? record.checkout.device : '-';
        const row = document.createElement('tr'); // 確保在這裡創建 row
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${checkinTime}<br>${checkinDevice}</td>
          <td class="py-3 px-4 border-b">${checkoutTime}<br>${checkoutDevice}</td>
        `;
        checkinRecords.appendChild(row);
      });
    }

    // 更新分頁資訊
    recordStart.textContent = (currentPage * 20) + 1;
    recordEnd.textContent = Math.min((currentPage + 1) * 20, totalRecords);
    recordTotal.textContent = totalRecords;

    // 控制分頁按鈕
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = !lastDoc || records.length < 20;

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    if (error.code === 'permission-denied') {
      checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: 權限不足，請確認您是管理員</td></tr>`;
    } else {
      checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${error.message}</td></tr>`;
    }
  }
}

function pairCheckinRecords(records) {
  const paired = {};
  records.forEach(record => {
    const key = `${record.name}_${record.location}_${new Date(record.timestamp).toLocaleDateString('zh-TW')}`;
    if (!paired[key]) {
      paired[key] = { name: record.name, location: record.location };
    }
    if (record.type === 'checkin') {
      paired[key].checkin = record;
    } else if (record.type === 'checkout') {
      paired[key].checkout = record;
    }
  });
  return Object.values(paired);
}

export function toggleDisplayMode(mode) {
  displayMode = mode;
  loadCheckinRecords(currentNameFilter, currentLocationFilter);
}
