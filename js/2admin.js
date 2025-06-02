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
let pageDocs = [];
let viewMode = 'raw';

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
  console.log('原始紀錄按鈕被點擊，設置 viewMode = raw');
  viewMode = 'raw';
  loadCheckinRecords(nameFilter.value, locationFilter.value, '', startDateInput.value, endDateInput.value);
});

consolidatedRecordsBtn.addEventListener('click', () => {
  console.log('出勤整合按鈕被點擊，設置 viewMode = consolidated');
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

// 解析時間戳（支援字串格式）
function parseTimestamp(timestamp) {
  if (typeof timestamp === 'number') return timestamp;
  try {
    const [date, time] = timestamp.split(' ');
    const [year, month, day] = date.split('/').map(Number);
    const [hour, minute, second] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  } catch (error) {
    console.error('解析 timestamp 失敗:', timestamp, error);
    return 0;
  }
}

// 格式化日期為 YYYY-MM-DD
function formatDate(timestamp) {
  const millis = parseTimestamp(timestamp);
  return new Date(millis).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '-');
}

// 加載打卡紀錄的函數
export async function loadCheckinRecords(name = '', location = '', direction = '', startDate = '', endDate = '') {
  const checkinRecords = document.getElementById('checkin-records');
  const recordStart = document.getElementById('record-start');
  const recordEnd = document.getElementById('record-end');
  const recordTotal = document.getElementById('record-total');

  // 重置分頁狀態
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

  console.log(`當前篩選條件 - 姓名: ${name}, 地點: ${location}, 開始日期: ${startDate}, 結束日期: ${endDate}, 方向: ${direction}, 模式: ${viewMode}`);

  try {
    let q = query(collection(db, '2checkins'), orderBy('timestamp', 'desc'));

    // 應用篩選條件
    if (name) q = query(q, where('name', '==', name));
    if (location) q = query(q, where('location', '==', location));
    if (startDate) q = query(q, where('timestamp', '>=', startDate));
    if (endDate) q = query(q, where('timestamp', '<=', endDate + ' 23:59:59'));

    // 分頁邏輯
    if (direction === 'next' && pageDocs[currentPage] && pageDocs[currentPage].lastDoc) {
      currentPage++;
      q = query(q, startAfter(pageDocs[currentPage - 1].lastDoc));
    } else if (direction === 'prev' && currentPage > 0) {
      currentPage--;
      if (currentPage === 0) {
        q = query(collection(db, '2checkins'), orderBy('timestamp', 'desc'));
        if (name) q = query(q, where('name', '==', name));
        if (location) q = query(q, where('location', '==', location));
        if (startDate) q = query(q, where('timestamp', '>=', startDate));
        if (endDate) q = query(q, where('timestamp', '<=', endDate + ' 23:59:59'));
      } else {
        q = query(q, endBefore(pageDocs[currentPage].firstDoc));
      }
    }

    q = query(q, limit(20));

    const querySnapshot = await getDocs(q);
    let records = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      data.timestamp = parseTimestamp(data.timestamp); // 解析 timestamp
      records.push({ id: doc.id, ...data });
    });

    console.log('原始記錄:', records);

    if (records.length > 0) {
      pageDocs[currentPage] = {
        firstDoc: querySnapshot.docs[0],
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
      console.log(`加載 ${records.length} 條記錄`);
    } else {
      pageDocs[currentPage] = { firstDoc: null, lastDoc: null };
      console.warn('沒有找到記錄');
    }

    let displayRecords = [];
    let totalRecords = 0;

    if (viewMode === 'consolidated') {
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
          if (!consolidatedRecords[key].checkin || record.timestamp < consolidatedRecords[key].checkin.timestamp) {
            consolidatedRecords[key].checkin = { timestamp: record.timestamp, device: record.device || '-' };
          }
        } else if (record.type === 'checkout') {
          if (!consolidatedRecords[key].checkout || record.timestamp > consolidatedRecords[key].checkout.timestamp) {
            consolidatedRecords[key].checkout = { timestamp: record.timestamp, device: record.device || '-' };
          }
        }
      });

      displayRecords = Object.values(consolidatedRecords).sort((a, b) => {
        const dateA = new Date(a.checkin ? a.checkin.timestamp : a.checkout.timestamp).getTime();
        const dateB = new Date(b.checkin ? b.checkin.timestamp : b.checkout.timestamp).getTime();
        return dateB - dateA;
      });

      console.log('整合後記錄:', displayRecords);

      // 計算總記錄數（整合模式）
      let totalQuery = query(collection(db, '2checkins'));
      if (name) totalQuery = query(totalQuery, where('name', '==', name));
      if (location) totalQuery = query(totalQuery, where('location', '==', location));
      if (startDate) totalQuery = query(totalQuery, where('timestamp', '>=', startDate));
      if (endDate) totalQuery = query(totalQuery, where('timestamp', '<=', endDate + ' 23:59:59'));
      const totalSnapshot = await getDocs(totalQuery);
      const tempRecords = [];
      totalSnapshot.forEach(doc => {
        const data = doc.data();
        data.timestamp = parseTimestamp(data.timestamp);
        tempRecords.push({ id: doc.id, ...data });
      });
      const tempGrouped = {};
      tempRecords.forEach(record => {
        const date = formatDate(record.timestamp);
        const key = `${record.name}_${date}`;
        if (!tempGrouped[key]) tempGrouped[key] = true;
      });
      totalRecords = Object.keys(tempGrouped).length;
    } else {
      // 原始模式
      displayRecords = records;
      console.log('原始模式記錄:', displayRecords);

      // 計算總記錄數（原始模式）
      let totalQuery = query(collection(db, '2checkins'));
      if (name) totalQuery = query(totalQuery, where('name', '==', name));
      if (location) totalQuery = query(totalQuery, where('location', '==', location));
      if (startDate) totalQuery = query(totalQuery, where('timestamp', '>=', startDate));
      if (endDate) totalQuery = query(totalQuery, where('timestamp', '<=', endDate + ' 23:59:59'));
      const totalSnapshot = await getDocs(totalQuery);
      totalRecords = totalSnapshot.size;
    }

    // 渲染記錄
    checkinRecords.innerHTML = '';
    displayRecords.forEach(record => {
      const row = document.createElement('tr');
      if (viewMode === 'consolidated') {
        const checkinTime = record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkin.device}` : '-';
        const checkoutTime = record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.checkout.device}` : '-';
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${checkinTime}</td>
          <td class="py-3 px-4 border-b">${checkoutTime}</td>
        `;
      } else {
        const checkinTime = record.type === 'checkin' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.device || '-'}` : '-';
        const checkoutTime = record.type === 'checkout' ? new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + `<br>${record.device || '-'}` : '-';
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${checkinTime}</td>
          <td class="py-3 px-4 border-b">${checkoutTime}</td>
        `;
      }
      checkinRecords.appendChild(row);
    });

    // 更新分頁資訊
    recordStart.textContent = (currentPage * 20) + 1;
    recordEnd.textContent = Math.min((currentPage + 1) * 20, totalRecords);
    recordTotal.textContent = totalRecords;

    // 控制分頁按鈕
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = displayRecords.length < 20 || !pageDocs[currentPage]?.lastDoc;

    // 匯出 Excel 按鈕
    exportExcelBtn.removeEventListener('click', exportToExcel);
    exportExcelBtn.addEventListener('click', () => exportToExcel(displayRecords));

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    let errorMessage = error.message;
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      errorMessage = `查詢需要索引，請在 Firebase 控制台中創建索引：${error.message.match(/https:\/\/[^\s]+/)[0]}`;
    } else if (error.code === 'permission-denied') {
      errorMessage = '權限不足，請確認您是管理員';
    }
    checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${errorMessage}</td></tr>`;
  }
}

// 匯出 Excel 功能
function exportToExcel(records) {
  const data = records.map(record => {
    if (viewMode === 'consolidated') {
      return {
        姓名: record.name,
        地點: record.location,
        日期: formatDate(record.checkin ? record.checkin.timestamp : record.checkout.timestamp),
        上班時間: record.checkin ? new Date(record.checkin.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        上班設備: record.checkin ? record.checkin.device : '-',
        下班時間: record.checkout ? new Date(record.checkout.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '-',
        下班設備: record.checkout ? record.checkout.device : '-'
      };
    } else {
      return {
        姓名: record.name,
        地點: record.location,
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
    let errorMessage = error.code === 'permission-denied' ? '載入失敗: 權限不足，請確認您是管理員' : `載入失敗: ${error.message}`;
    ipList.innerHTML = `<li class="text-red-600">${errorMessage}</li>`;
  }
}
