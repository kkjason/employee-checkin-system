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

// 按鈕事件綁定
function bindButtonEvents() {
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

  addIpBtn.addEventListener('click', async () => {
    const ip = ipInput.value.trim();
    if (!ip) {
      alert('請輸入有效的 IP 位址');
      return;
    }
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      alert('請輸入有效的 IPv4 位址');
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

  // 匯出 Excel 按鈕事件（單次綁定）
  exportExcelBtn.removeEventListener('click', exportExcelHandler); // 移除舊的事件監聽器
  exportExcelBtn.addEventListener('click', exportExcelHandler);
}

function exportExcelHandler() {
  const records = getCurrentRecords();
  exportToExcel(records);
}

// 儲存當前顯示的記錄
let currentRecords = [];

function getCurrentRecords() {
  return currentRecords;
}

// 等待 DOM 載入完成
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('用戶 UID:', user.uid, '電子郵件:', user.email);
      document.getElementById('admin-container').classList.remove('hidden');
      ipManagement.classList.remove('hidden');
      checkinManagement.classList.add('hidden');
      bindButtonEvents();
      await loadIPWhitelist();
    } else {
      console.log('無用戶登入');
      window.location.href = '/index.html';
    }
  });
});

// 合併上下班記錄的輔助函數
function pairCheckinCheckout(records) {
  const pairedRecords = [];
  const groupedByName = {};

  // 按員工姓名分組
  records.forEach(record => {
    if (!groupedByName[record.name]) {
      groupedByName[record.name] = [];
    }
    groupedByName[record.name].push(record);
  });

  // 對每個員工的記錄進行配對
  for (const name in groupedByName) {
    const employeeRecords = groupedByName[name].sort((a, b) => a.timestamp - b.timestamp);
    let i = 0;
    while (i < employeeRecords.length) {
      const checkin = employeeRecords[i].type === 'checkin' ? employeeRecords[i] : null;
      let checkout = null;

      // 尋找下一個 checkout，且時間差在 12 小時內（處理大夜班跨日）
      if (checkin) {
        for (let j = i + 1; j < employeeRecords.length; j++) {
          if (employeeRecords[j].type === 'checkout') {
            const timeDiff = employeeRecords[j].timestamp - checkin.timestamp;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff <= 12) {
              checkout = employeeRecords[j];
              i = j + 1; // 跳過已配對的 checkout
              break;
            }
          }
        }
      }

      // 如果只有 checkin 或只有 checkout
      pairedRecords.push({
        name,
        location: checkin ? checkin.location : (checkout ? checkout.location : employeeRecords[i].location),
        checkinTime: checkin ? new Date(checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        checkinDevice: checkin ? (checkin.device || '-') : '-',
        checkoutTime: checkout ? new Date(checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        checkoutDevice: checkout ? (checkout.device || '-') : '-'
      });

      if (!checkin && !checkout) {
        i++; // 處理未配對的記錄
      }
    }
  }

  return pairedRecords;
}

// 加載打卡紀錄的函數
async function loadCheckinRecords(name = '', location = '', direction = '', startDate = '', endDate = '') {
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

  console.log(`當前篩選條件 - 姓名: ${name}, 地點: ${location}, 開始日期: ${startDate}, 結束日期: ${endDate}, 方向: ${direction}`);

  try {
    // 構建基本查詢
    let q = query(collection(db, 'checkins'), orderBy('name'), orderBy('timestamp', 'desc'));

    // 應用篩選條件
    if (name) q = query(q, where('name', '==', name));
    if (location) q = query(q, where('location', '==', location));
    if (startDate) q = query(q, where('timestamp', '>=', new Date(startDate).getTime()));
    if (endDate) q = query(q, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));

    // 分頁邏輯
    if (direction === 'next' && pageDocs[currentPage] && pageDocs[currentPage].lastDoc) {
      currentPage++;
      q = query(q, startAfter(pageDocs[currentPage - 1].lastDoc));
    } else if (direction === 'prev' && currentPage > 0) {
      currentPage--;
      if (currentPage === 0) {
        q = query(collection(db, 'checkins'), orderBy('name'), orderBy('timestamp', 'desc'));
        if (name) q = query(q, where('name', '==', name));
        if (location) q = query(q, where('location', '==', location));
        if (startDate) q = query(q, where('timestamp', '>=', new Date(startDate).getTime()));
        if (endDate) q = query(q, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));
      } else {
        q = query(q, endBefore(pageDocs[currentPage].firstDoc));
      }
    }

    // 限制查詢數量
    q = query(q, limit(100));
    console.log(`當前頁碼: ${currentPage}`);

    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    // 更新分頁控制變數
    if (records.length > 0) {
      pageDocs[currentPage] = {
        firstDoc: querySnapshot.docs[0],
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
      console.log(`加載 ${records.length} 條原始記錄`);
    } else {
      pageDocs[currentPage] = { firstDoc: null, lastDoc: null };
      console.warn('沒有找到記錄');
    }

    // 合併上下班記錄
    const pairedRecords = pairCheckinCheckout(records);
    const startIndex = currentPage * 20;
    const endIndex = startIndex + 20;
    currentRecords = pairedRecords.slice(startIndex, endIndex);

    // 計算總記錄數
    let totalQuery = query(collection(db, 'checkins'));
    if (name) totalQuery = query(totalQuery, where('name', '==', name));
    if (location) totalQuery = query(totalQuery, where('location', '==', location));
    if (startDate) totalQuery = query(totalQuery, where('timestamp', '>=', new Date(startDate).getTime()));
    if (endDate) totalQuery = query(totalQuery, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));
    const totalSnapshot = await getDocs(totalQuery);
    const totalRecords = Math.ceil(totalSnapshot.size / 2);

    // 渲染記錄
    checkinRecords.innerHTML = '';
    currentRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-3 px-4 border-b">${record.name}</td>
        <td class="py-3 px-4 border-b">${record.location}</td>
        <td class="py-3 px-4 border-b">${record.checkinTime}<br>${record.checkinDevice}</td>
        <td class="py-3 px-4 border-b">${record.checkoutTime}<br>${record.checkoutDevice}</td>
      `;
      checkinRecords.appendChild(row);
    });

    // 更新分頁資訊
    recordStart.textContent = startIndex + 1;
    recordEnd.textContent = Math.min(endIndex, pairedRecords.length);
    recordTotal.textContent = pairedRecords.length;

    // 控制分頁按鈕狀態
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = endIndex >= pairedRecords.length;

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    let errorMessage = error.message;
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      if (error.message.includes('index is currently building')) {
        errorMessage = `索引正在構建中，請稍後重試。檢查索引狀態：${error.message.match(/https:\/\/[^\s]+/)[0]}`;
      } else {
        errorMessage = `查詢需要索引，請在 Firebase 控制台中創建索引：${error.message.match(/https:\/\/[^\s]+/)[0]}`;
      }
    } else if (error.code === 'permission-denied') {
      errorMessage = '權限不足，請確認您是管理員';
    }
    checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${errorMessage}</td></tr>`;
  }
}

// 匯出 Excel 功能
function exportToExcel(records) {
  const data = records.map(record => ({
    姓名: record.name,
    地點: record.location,
    上班時間: record.checkinTime,
    上班設備: record.checkinDevice,
    下班時間: record.checkoutTime,
    下班設備: record.checkoutDevice
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '打卡紀錄');
  XLSX.writeFile(wb, `打卡紀錄_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 載入 IP 白名單的函數
async function loadIPWhitelist() {
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
