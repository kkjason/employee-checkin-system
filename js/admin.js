import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit, startAfter, endBefore, deleteDoc, doc, updateDoc, getFirestore, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCv1ywEy0oaL8FNBLAEO-Ban5lMs26Y_gY",
  authDomain: "employee-checkin-system.firebaseapp.com",
  projectId: "employee-checkin-system",
  storageBucket: "employee-checkin-system.appspot.com",
  messagingSenderId: "646412258577",
  appId: "1:646412258577:web:7f32d3c069c415c9b190b0",
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
let pageDocs = [];
let viewMode = 'raw';
let allRecords = [];

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
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ip || !ipRegex.test(ip)) {
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

  checkinRecords.innerHTML = '<tr><td colspan="5" class="py-3 text-center">載入中...</td></tr>';

  // 重置分頁
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
    let records = [];
    allRecords = [];

    if (viewMode === 'raw') {
      let baseQuery = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));

      // 應用篩選條件
      if (name) baseQuery = query(baseQuery, where('name', '==', name));
      if (location) baseQuery = query(baseQuery, where('location', '==', location));
      if (startDate) baseQuery = query(baseQuery, where('timestamp', '>=', new Date(startDate).getTime()));
      if (endDate) baseQuery = query(baseQuery, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));

      // 分頁邏輯
      let displayQuery = baseQuery;
      if (direction === 'next' && pageDocs[currentPage]?.lastDoc) {
        displayQuery = query(baseQuery, startAfter(pageDocs[currentPage].lastDoc), limit(20));
      } else if (direction === 'prev' && currentPage > 0 && pageDocs[currentPage - 1]?.firstDoc) {
        displayQuery = query(baseQuery, endBefore(pageDocs[currentPage - 1].firstDoc), limit(20));
      } else {
        displayQuery = query(baseQuery, limit(20));
      }

      // 查詢顯示紀錄
      const displaySnapshot = await getDocs(displayQuery);
      let firstDoc = null;
      let lastDoc = null;
      displaySnapshot.forEach((doc, index) => {
        if (index === 0) firstDoc = doc;
        if (index === displaySnapshot.size - 1) lastDoc = doc;
        records.push({ id: doc.id, ...doc.data() });
      });

      // 查詢所有紀錄（用於匯出和總數計算）
      const allSnapshot = await getDocs(baseQuery);
      allSnapshot.forEach((doc) => {
        allRecords.push({ id: doc.id, ...doc.data() });
      });

      // 更新分頁資料
      if (records.length > 0) {
        pageDocs[currentPage] = { firstDoc, lastDoc };
        if (direction === 'next') {
          currentPage++;
          pageDocs[currentPage] = { firstDoc, lastDoc };
        } else if (direction === 'prev' && currentPage > 0) {
          currentPage--;
        }
      }
    } else {
      // 整合模式：查詢所有符合條件的紀錄
      let q = query(collection(db, 'checkins'), orderBy('timestamp', 'asc'));
      if (name) q = query(q, where('name', '==', name));
      if (location) q = query(q, where('location', '==', location));
      if (startDate) q = query(q, where('timestamp', '>=', new Date(startDate).getTime()));
      if (endDate) q = query(q, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      allRecords = records;
    }

    let displayRecords = [];
    let totalRecords = 0;

    if (viewMode === 'consolidated') {
      // 整合模式：按姓名、地點、日期分組
      const groupedRecords = {};
      records.forEach(record => {
        const date = formatDate(record.timestamp);
        const key = `${record.name}_${record.location}_${date}`;
        if (!groupedRecords[key]) {
          groupedRecords[key] = [];
        }
        groupedRecords[key].push(record);
      });

      const consolidatedRecords = [];
      Object.entries(groupedRecords).forEach(([key, records]) => {
        records.sort((a, b) => a.timestamp - b.timestamp);
        const [name, location, date] = key.split('_');
        let i = 0;
        while (i < records.length) {
          const record = { name, location, date, checkin: null, checkout: null };
          if (records[i].type === 'checkin') {
            record.checkin = { timestamp: records[i].timestamp, device: records[i].device || '-' };
            let j = i + 1;
            while (j < records.length && records[j].type !== 'checkout') {
              j++;
            }
            if (j < records.length && formatDate(records[j].timestamp) === date) {
              record.checkout = { timestamp: records[j].timestamp, device: records[j].device || '-' };
              i = j + 1;
            } else {
              i++;
            }
          } else {
            record.checkout = { timestamp: records[i].timestamp, device: records[i].device || '-' };
            i++;
          }
          consolidatedRecords.push(record);
        }
      });

      displayRecords = consolidatedRecords.sort((a, b) => {
        const timeA = a.checkin ? a.checkin.timestamp : (a.checkout ? a.checkout.timestamp : 0);
        const timeB = b.checkin ? b.checkin.timestamp : (b.checkout ? b.checkout.timestamp : 0);
        return timeB - timeA;
      });
      totalRecords = consolidatedRecords.length;
      allRecords = displayRecords;
    } else {
      displayRecords = records;
      totalRecords = allRecords.length;
    }

    // 渲染紀錄
    checkinRecords.innerHTML = '';
    displayRecords.forEach(record => {
      const row = document.createElement('tr');
      if (viewMode === 'consolidated') {
        const checkinTime = record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkin.device}` : '-';
        const checkoutTime = record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkout.device}` : '-';
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${record.date}</td>
          <td class="py-3 px-4 border-b">${checkinTime}</td>
          <td class="py-3 px-4 border-b">${checkoutTime}</td>
        `;
      } else {
        const checkinTime = record.type === 'checkin' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.device || '-'}` : '-';
        const checkoutTime = record.type === 'checkout' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.device || '-'}` : '-';
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${formatDate(record.timestamp)}</td>
          <td class="py-3 px-4 border-b">${checkinTime}</td>
          <td class="py-3 px-4 border-b">${checkoutTime}</td>
        `;
      }
      checkinRecords.appendChild(row);
    });

    // 更新分頁資訊
    if (viewMode === 'raw') {
      recordStart.textContent = displayRecords.length > 0 ? currentPage * 20 + 1 : 0;
      recordEnd.textContent = displayRecords.length > 0 ? currentPage * 20 + displayRecords.length : 0;
    } else {
      recordStart.textContent = displayRecords.length > 0 ? 1 : 0;
      recordEnd.textContent = displayRecords.length;
    }
    recordTotal.textContent = totalRecords;

    // 控制分頁按鈕
    prevPageBtn.disabled = viewMode === 'consolidated' || currentPage === 0;
    nextPageBtn.disabled = viewMode === 'consolidated' || records.length < 20;

    // 匯出 Excel 按鈕
    exportExcelBtn.removeEventListener('click', exportToExcel);
    exportExcelBtn.addEventListener('click', () => exportToExcel());

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    checkinRecords.innerHTML = `<tr><td colspan="5" class="py-3 px-4 text-red-600 text-center">載入失敗: ${error.message}</td></tr>`;
  }
}

// 匯出 Excel
function exportToExcel() {
  const data = allRecords.map(record => {
    if (viewMode === 'consolidated') {
      return {
        姓名: record.name,
        地點: record.location,
        日期: record.date,
        上班時間: record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        上班設備: record.checkin ? record.checkin.device : '-',
        下班時間: record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        下班設備: record.checkout ? record.checkout.device : '-'
      };
    } else {
      return {
        姓名: record.name,
        地點: record.location,
        日期: formatDate(record.timestamp),
        上班時間: record.type === 'checkin' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        下班時間: record.type === 'checkout' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        設備: record.device || '-'
      };
    }
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '打卡紀錄');
  XLSX.writeFile(wb, `打卡紀錄_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 載入 IP 白名單
export async function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '<li class="text-center py-3">載入資料...</li>';
  try {
    const querySnapshot = await getDocs(collection(db, 'whitelist'));
    ipList.innerHTML = '';
    if (querySnapshot.empty) {
      ipList.innerHTML = '<li class="text-center py-3 text-gray-600">尚無 IP 白名單</li>';
      return;
    }
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
        if (newIp && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(newIp)) {
          try {
            await updateDoc(doc(db, 'whitelist', id), { ip: newIp });
            loadIPWhitelist();
          } catch (error) {
            console.error('更新 IP 失敗:', error);
            alert('更新失敗: ' + error.message);
          }
        } else {
          alert('請輸入有效的 IPv4 位址');
        }
      });
    });
  } catch (error) {
    console.error('載入 IP 白名單失敗:', error);
    ipList.innerHTML = `<li class="text-red-600">${error.code === 'permission-denied' ? '載入失敗: 權限不足，請確認您是管理員' : `載入失敗: ${error.message}`}</li>`;
  }
}
