// admin.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit, startAfter, endBefore, deleteDoc, doc, updateDoc, getFirestore, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

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
const db = getFirestore(app);
const auth = getAuth(app);

let currentPage = 0;
let currentNameFilter = '';
let currentLocationFilter = '';
let currentStartDate = null;
let currentEndDate = null;
let pageDocs = []; // 儲存每頁的 firstDoc 和 lastDoc
let viewMode = 'raw'; // 顯示模式：'raw'（原始紀錄）或 'consolidated'（出勤整合）

// DOM 元素
const ipManagement = document.getElementById('ip-management');
const checkinManagement = document.getElementById('checkin-management');
const ipManagementBtn = document.getElementById('ip-management-btn');
const checkinManagementBtn = document.getElementById('checkin-management-btn');
const logoutBtn = document.getElementById('logout-btn');
const nameFilter = document.getElementById('name-filter');
const locationFilter = document.getElementById('location-filter');
const searchBtn = document.getElementById('search-btn');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const exportExcelBtn = document.getElementById('export-excel-btn');
const addIpBtn = document.getElementById('add-ip-btn');
const ipInput = document.getElementById('ip-input');
const rawRecordsBtn = document.getElementById('raw-records-btn');
const consolidatedRecordsBtn = document.getElementById('consolidated-records-btn');

// 按鈕事件綁定
ipManagementBtn.addEventListener('click', () => {
  ipManagement.classList.remove('hidden');
  checkinManagement.classList.add('hidden');
  loadIPWhitelist();
});

checkinManagementBtn.addEventListener('click', () => {
  checkinManagement.classList.remove('hidden');
  ipManagement.classList.add('hidden');
  loadCheckinRecords();
});

searchBtn.addEventListener('click', () => {
  loadCheckinRecords(nameFilter.value, locationFilter.value, '', startDateInput.value, endDateInput.value);
});

prevPageBtn.addEventListener('click', () => {
  loadCheckinRecords(nameFilter.value, locationFilter.value, 'prev', startDateInput.value, endDateInput.value);
});

nextPageBtn.addEventListener('click', () => {
  loadCheckinRecords(nameFilter.value, locationFilter.value, 'next', startDateInput.value, endDateInput.value);
});

rawRecordsBtn.addEventListener('click', () => {
  viewMode = 'raw';
  loadCheckinRecords(nameFilter.value, locationFilter.value, '', startDateInput.value, endDateInput.value);
});

consolidatedRecordsBtn.addEventListener('click', () => {
  viewMode = 'consolidated';
  loadCheckinRecords(nameFilter.value, locationFilter.value, '', startDateInput.value, endDateInput.value);
});

// 等待 DOM 載入完成
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('用戶 UID:', user.uid, '電子郵件:', user.email);
      document.getElementById('admin-container').classList.remove('hidden');
      ipManagement.classList.remove('hidden');
      checkinManagement.classList.add('hidden');
      await loadIPWhitelist();
    } else {
      console.log('無用戶登入');
      window.location.href = '/index.html';
    }
  });
});

// 登出按鈕事件
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('登出成功');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('登出失敗:', error);
    alert('登出失敗: ' + error.message);
  }
});

// 新增 IP 位址
addIpBtn.addEventListener('click', async () => {
  const ip = ipInput.value.trim();
  if (!ip) {
    alert('請輸入有效的 IP 位址');
    return;
  }
  try {
    await addDoc(collection(db, 'whitelist'), { ip });
    ipInput.value = '';
    loadIPWhitelist();
  } catch (error) {
    console.error('新增 IP 失敗:', error);
    alert('新增 IP 失敗: ' + error.message);
  }
});

// 格式化日期為 YYYY-MM-DD
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '-');
}

// 加載打卡紀錄的函數
export async function loadCheckinRecords(name = '', location = '', direction = '', startDate = '', endDate = '') {
  const checkinRecords = document.getElementById('checkin-records');
  const recordStart = document.getElementById('record-start');
  const recordEnd = document.getElementById('record-end');
  const recordTotal = document.getElementById('record-total');

  // 當篩選條件改變時，重置分頁狀態
  if (
    currentNameFilter !== name ||
    currentLocationFilter !== location ||
    currentStartDate !== startDate ||
    currentEndDate !== endDate
  ) {
    currentPage = 0;
    pageDocs = [];
  }

  currentNameFilter = name;
  currentLocationFilter = location;
  currentStartDate = startDate;
  currentEndDate = endDate;

  try {
    let q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(20));

    // 應用篩選條件
    if (name) q = query(q, where('name', '==', name));
    if (location) q = query(q, where('location', '==', location));
    if (startDate) q = query(q, where('timestamp', '>=', new Date(startDate).getTime()));
    if (endDate) q = query(q, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));

    // 分頁邏輯
    if (direction === 'next' && pageDocs[currentPage]) {
      q = query(q, startAfter(pageDocs[currentPage].lastDoc));
    } else if (direction === 'prev' && currentPage > 0 && pageDocs[currentPage - 1]) {
      q = query(q, endBefore(pageDocs[currentPage - 1].firstDoc));
    }

    const querySnapshot = await getDocs(q);
    let records = [];
    let firstDoc = null;
    let lastDoc = null;

    querySnapshot.forEach((doc, index) => {
      if (index === 0) firstDoc = doc;
      if (index === querySnapshot.size - 1) lastDoc = doc;
      records.push({ id: doc.id, ...doc.data() });
    });

    // 更新分頁資料
    if (direction === 'next') {
      currentPage++;
      pageDocs[currentPage] = { firstDoc, lastDoc };
    } else if (direction === 'prev' && currentPage > 0) {
      currentPage--;
    } else if (direction === '') {
      pageDocs = [{ firstDoc, lastDoc }];
      currentPage = 0;
    }

    // 整合紀錄
    const consolidatedRecords = {};
    records.forEach(record => {
      const date = formatDate(record.timestamp);
      const key = `${record.name}_${date}`;
      if (!consolidatedRecords[key]) {
        consolidatedRecords[key] = {
          name: record.name,
          location: record.location,
          checkin: null,
          checkout: null
        };
      }
      if (record.type === 'checkin') {
        consolidatedRecords[key].checkin = { timestamp: record.timestamp, device: record.device || '-' };
      } else if (record.type === 'checkout') {
        consolidatedRecords[key].checkout = { timestamp: record.timestamp, device: record.device || '-' };
      }
    });

    // 轉為陣列並排序
    const displayRecords = Object.values(consolidatedRecords).sort((a, b) => {
      const dateA = new Date(a.checkin ? a.checkin.timestamp : a.checkout.timestamp).getTime();
      const dateB = new Date(b.checkin ? b.checkin.timestamp : b.checkout.timestamp).getTime();
      return dateB - dateA; // 按日期降序
    });

    // 渲染記錄
    checkinRecords.innerHTML = '';
    displayRecords.forEach(record => {
      const checkinTime = record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkin.device}` : '-';
      const checkoutTime = record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkout.device}` : '-';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-3 px-4 border-b">${record.name}</td>
        <td class="py-3 px-4 border-b">${record.location}</td>
        <td class="py-3 px-4 border-b">${checkinTime}</td>
        <td class="py-3 px-4 border-b">${checkoutTime}</td>
      `;
      checkinRecords.appendChild(row);
    });

    // 更新分頁資訊
    recordStart.textContent = currentPage * 20 + 1;
    recordEnd.textContent = currentPage * 20 + Math.min(20, displayRecords.length);
    recordTotal.textContent = displayRecords.length;

    // 控制分頁按鈕
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = querySnapshot.size < 20;

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${error.message}</td></tr>`;
  }
}

// 匯出 Excel 功能
function exportToExcel(records) {
  const data = records.map(record => {
    return {
      姓名: record.name,
      地點: record.location,
      上班時間: record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
      下班時間: record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
      設備: record.checkin ? record.checkin.device : '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '打卡紀錄');
  XLSX.writeFile(wb, `打卡紀錄_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 載入 IP 白名單的函數
export async function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  try {
    const querySnapshot = await getDocs(collection(db, 'whitelist'));
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

    document.querySelectorAll('.delete-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await deleteDoc(doc(db, 'whitelist', id));
          loadIPWhitelist();
        } catch (error) {
          console.error('刪除 IP 失敗:', error);
          alert('刪除失敗: ' + error.message);
        }
      });
    });

    document.querySelectorAll('.edit-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const newIp = prompt("請輸入新的 IP 位址:", btn.closest('li').querySelector('span').textContent);
        if (newIp) {
          try {
            await updateDoc(doc(db, 'whitelist', id), { ip: newIp });
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
    ipList.innerHTML = `<li class="text-red-600">${error.code === 'permission-denied' ? '載入失敗: 權限不足，請確認您是管理員' : `載入失敗: ${error.message}`}</li>`;
  }
}
