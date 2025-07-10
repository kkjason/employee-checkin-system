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

// 管理員 UID 清單，與安全規則中的 isAdmin 保持一致
const ADMIN_UIDS = ['HkoddoWHmOWJ03OfnbU9SePx9uJ2'];

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
      if (ADMIN_UIDS.includes(user.uid)) {
        document.getElementById('admin-container').classList.remove('hidden');
        ipManagement.classList.remove('hidden');
        checkinManagement.classList.add('hidden');
        try {
          await loadIPWhitelist();
        } catch (error) {
          console.error('初始載入 IP 白名單失敗:', error);
          alert('載入失敗: ' + error.message);
        }
      } else {
        console.log('無管理員權限');
        window.location.href = '/2admin_login.html';
      }
    } else {
      console.log('無用戶登入');
      window.location.href = '/2admin_login.html';
    }
  });
});

// 登出按鈕事件
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('登出成功');
    window.location.href = '/2admin_login.html';
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

// 解析時間戳（支援多種格式）
function parseTimestamp(timestamp) {
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp !== 'string') {
    console.error('無效的 timestamp 類型:', timestamp);
    return 0;
  }

  try {
    // 處理 ISO 格式（例如 "2025-06-02T07:48:58.000Z"）
    if (timestamp.includes('T')) {
      return new Date(timestamp).getTime();
    }

    // 處理 "YYYY/M/D H:mm:ss" 或 "YYYY/M/D 上午H:mm:ss" 或 "YYYY/M/D 下午H:mm:ss"
    let datePart, timePart, isPM = false;
    if (timestamp.includes('上午') || timestamp.includes('下午')) {
      isPM = timestamp.includes('下午');
      [datePart, timePart] = timestamp.replace(/上午|下午/, '').trim().split(' ');
    } else {
      [datePart, timePart] = timestamp.split(' ');
    }

    const [year, month, day] = datePart.split(/[-/]/).map(Number);
    let [hour, minute, second] = timePart.split(':').map(Number);

    // 處理上午/下午（下午加 12 小時，除非是 12 點）
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0; // 上午 12 點應為 00:00
    }

    const date = new Date(year, month - 1, day, hour, minute, second);
    if (isNaN(date.getTime())) {
      throw new Error('無效的日期');
    }
    return date.getTime();
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

// 合併重複打卡記錄（60分鐘內）
function mergeDuplicateRecords(records) {
  const mergedRecords = [];
  const groupedByKey = {};

  // 按姓名、地點、日期、類型分組
  records.forEach(record => {
    const date = formatDate(record.timestamp);
    const key = `${record.name}_${record.location}_${date}_${record.type}`;
    if (!groupedByKey[key]) {
      groupedByKey[key] = [];
    }
    groupedByKey[key].push(record);
  });

  // 對每組記錄進行合併
  Object.values(groupedByKey).forEach(group => {
    if (group.length === 1) {
      mergedRecords.push(group[0]);
      return;
    }

    // 按時間排序
    group.sort((a, b) => a.timestamp - b.timestamp);

    // 合併60分鐘內的重複記錄（保留第一筆）
    let lastRecord = group[0];
    mergedRecords.push(lastRecord);

    for (let i = 1; i < group.length; i++) {
      const current = group[i];
      const timeDiff = (current.timestamp - lastRecord.timestamp) / (1000 * 60); // 分鐘差
      if (timeDiff > 60) {
        mergedRecords.push(current);
        lastRecord = current;
      }
    }
  });

  // 按時間降序排序
  return mergedRecords.sort((a, b) => b.timestamp - a.timestamp);
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

  console.log(`當前查詢 - 姓名: ${name}, 地點: ${location}, 開始日期: ${startDate}, 結束日期: ${endDate}, 方向: ${direction}, 模式: ${viewMode}`);

  try {
    let records = [];
    allRecords = [];

    if (viewMode === 'raw') {
      let displayQuery = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));
      let allQuery = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));

      // 應用篩選條件
      if (name) {
        displayQuery = query(displayQuery, where('name', '==', name));
        allQuery = query(allQuery, where('name', '==', name));
      }
      if (location) {
        displayQuery = query(displayQuery, where('location', '==', location));
        allQuery = query(allQuery, where('location', '==', location));
      }
      if (startDate) {
        displayQuery = query(displayQuery, where('timestamp', '>=', startDate));
        allQuery = query(allQuery, where('timestamp', '>=', startDate));
      }
      if (endDate) {
        displayQuery = query(displayQuery, where('timestamp', '<=', endDate + ' 23:59:59'));
        allQuery = query(allQuery, where('timestamp', '<=', endDate + ' 23:59:59'));
      }

      // 分頁邏輯（僅用於顯示）
      if (direction === 'next' && pageDocs[currentPage] && pageDocs[currentPage].lastDoc) {
        currentPage++;
        displayQuery = query(displayQuery, startAfter(pageDocs[currentPage - 1].lastDoc));
      } else if (direction === 'prev' && currentPage > 0) {
        currentPage--;
        if (currentPage === 0) {
          displayQuery = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));
          if (name) displayQuery = query(displayQuery, where('name', '==', name));
          if (location) displayQuery = query(displayQuery, where('location', '==', location));
          if (startDate) displayQuery = query(displayQuery, where('timestamp', '>=', startDate));
          if (endDate) displayQuery = query(displayQuery, where('timestamp', '<=', endDate + ' 23:59:59'));
        } else {
          displayQuery = query(displayQuery, endBefore(pageDocs[currentPage].firstDoc));
        }
      }

      displayQuery = query(displayQuery, limit(20));

      // 查詢顯示紀錄
      const displaySnapshot = await getDocs(displayQuery);
      displaySnapshot.forEach((doc) => {
        const data = doc.data();
        data.timestamp = parseTimestamp(data.timestamp);
        records.push({ id: doc.id, ...data });
      });

      // 查詢所有紀錄（用於匯出）
      const allSnapshot = await getDocs(allQuery);
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        data.timestamp = parseTimestamp(data.timestamp);
        allRecords.push({ id: doc.id, ...data });
      });

      // 合併重複打卡記錄
      records = mergeDuplicateRecords(records);
      allRecords = mergeDuplicateRecords(allRecords);

      if (records.length > 0) {
        pageDocs[currentPage] = {
          firstDoc: displaySnapshot.docs[0],
          lastDoc: displaySnapshot.docs[displaySnapshot.docs.length - 1]
        };
        console.log(`顯示 ${records.length} 條記錄`);
      } else {
        pageDocs[currentPage] = { firstDoc: null, lastDoc: null };
        console.warn('沒有找到記錄');
      }
      console.log(`匯出用 ${allRecords.length} 條記錄`);
    } else {
      // 整合模式：查詢所有符合條件的紀錄
      let q = query(collection(db, 'checkins'), orderBy('timestamp', 'asc'));
      if (name) q = query(q, where('name', '==', name));
      if (location) q = query(q, where('location', '==', location));
      if (startDate) q = query(q, where('timestamp', '>=', startDate));
      if (endDate) q = query(q, where('timestamp', '<=', endDate + ' 23:59:59'));

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        data.timestamp = parseTimestamp(data.timestamp);
        records.push({ id: doc.id, ...data });
      });

      // 合併重複打卡記錄
      records = mergeDuplicateRecords(records);
      allRecords = records;
      console.log(`整合模式加載 ${records.length} 條記錄`);
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
        // 按時間排序
        records.sort((a, b) => a.timestamp - b.timestamp);

        const [name, location, date] = key.split('_');
        let i = 0;
        while (i < records.length) {
          const record = { name, location, date, checkin: null, checkout: null };

          if (records[i].type === 'checkin') {
            record.checkin = { timestamp: records[i].timestamp, device: records[i].device || '-' };
            // 尋找同一天的下一個 checkout
            let j = i + 1;
            while (j < records.length && records[j].type !== 'checkout') {
              j++;
            }
            if (j < records.length && formatDate(records[j].timestamp) === date) {
              record.checkout = { timestamp: records[j].timestamp, device: records[j].device || '-' };
              i = j + 1; // 跳過已配對的 checkout
            } else {
              i++; // 無配對 checkout，保留單獨 checkin
            }
          } else {
            // 開頭為 checkout，作為獨立紀錄
            record.checkout = { timestamp: records[i].timestamp, device: records[i].device || '-' };
            i++;
          }
          consolidatedRecords.push(record);
        }
      });

      // 按日期降序排序
      displayRecords = consolidatedRecords.sort((a, b) => {
        const timeA = a.checkin ? a.checkin.timestamp : (a.checkout ? a.checkout.timestamp : 0);
        const timeB = b.checkin ? b.checkin.timestamp : (b.checkout ? b.checkout.timestamp : 0);
        return timeB - timeA;
      });

      totalRecords = consolidatedRecords.length;
      allRecords = displayRecords;
      console.log('整合後記錄:', displayRecords);
    } else {
      // 原始模式
      displayRecords = records;
      console.log('原始模式顯示紀錄:', displayRecords);

      // 計算總記錄數
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
      recordStart.textContent = (currentPage * 20) + 1;
      recordEnd.textContent = Math.min((currentPage + 1) * 20, totalRecords);
    } else {
      recordStart.textContent = 1;
      recordEnd.textContent = totalRecords;
    }
    recordTotal.textContent = totalRecords;

    // 控制分頁按鈕（僅限原始模式）
    prevPageBtn.disabled = viewMode === 'consolidated' || currentPage === 0;
    nextPageBtn.disabled = viewMode === 'consolidated' || (viewMode === 'raw' && records.length < 20) || !pageDocs[currentPage]?.lastDoc;

    // 匯出 Excel 按鈕
    exportExcelBtn.removeEventListener('click', exportToExcel);
    exportExcelBtn.addEventListener('click', () => exportToExcel());

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    let errorMessage = error.message;
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      errorMessage = `查詢需要索引，請在 Firebase 控制台中創建索引：${error.message.match(/https:\/\/[^\s]+/)?.[0] || error.message}`;
    } else if (error.code === 'permission-denied') {
      errorMessage = '權限不足，請確認您是管理員';
      window.location.assign('/2admin_login.html');
      return;
    }
    checkinRecords.innerHTML = `<tr><td colspan="5" class="py-3 px-4 text-red-600 text-center">載入失敗: ${errorMessage}</td></tr>`;
  }
}

// 匯出 Excel
function exportToExcel() {
  exportExcelBtn.disabled = true;

  try {
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
  } catch (error) {
    console.error('匯出 Excel 失敗:', error);
    alert('匯出失敗: ' + error.message);
  } finally {
    exportExcelBtn.disabled = false;
  }
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
      li.className = 'flex justify-between items-center p-2 bg-white rounded-lg';
      li.innerHTML = `
        <span class="flex-1">${ip}</span>
        <div class="flex space-x-2">
          <button class="text-blue-500 hover:text-blue-700 edit-ip-btn px-2 py-1 border-b" data-id="${doc.id}">編輯</button>
          <button class="text-red-500 hover:text-red-700 delete-ip-btn px-2 py-1 border-b" data-id="${doc.id}">删除</button>
        </div>
      `;
      ipList.appendChild(li);
    });

    document.querySelectorAll('.delete-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
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
        const id = btn.getAttribute('data-id');
        const newIp = prompt("請輸入新的 IP 地址:", btn.closest('li').querySelector('span').textContent);
        if (newIp && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(newIp)) {
          try {
            await updateDoc(doc(db, 'whitelist', id), { ip: newIp });
            loadIPWhitelist();
          } catch (error) {
            console.error('更新 IP 失敗:', error);
            alert('更新失敗: ' + error.message);
          }
        } else {
          alert('請輸入有效的 IPv4 地址');
        }
      });
    });
  } catch (error) {
    console.error('載入白名單失敗:', error);
    let errorMessage = error.code === 'permission-denied' ? '權限不足，請確認您是管理員' : error.message;
    ipList.innerHTML = `<li class="text-red-500 text-center py-3">${errorMessage}</li>`;
    if (error.code === 'permission-denied') {
      window.location.assign('/2admin_login.html');
    }
  }
}
