import { collection, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let lastDoc = null;
let firstDoc = null;
let displayMode = 'original';
let currentNameFilter = '';
let currentLocationFilter = '';

export async function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  try {
    const querySnapshot = await getDocs(collection(window.db, 'whitelist'));
    querySnapshot.forEach((doc) => {
      const ip = doc.data().ip;
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center p-2 bg-gray-50 rounded-lg';
      li.innerHTML = `
        <span>${ip}</span>
        <button class="text-red-600 hover:text-red-800 delete-ip-btn" data-id="${doc.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      `;
      ipList.appendChild(li);
    });

    // 綁定刪除按鈕事件
    document.querySelectorAll('.delete-ip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await deleteDoc(doc(window.db, 'whitelist', id));
          loadIPWhitelist();
        } catch (error) {
          console.error('刪除 IP 失敗:', error);
          alert('刪除失敗: ' + error.message);
        }
      });
    });
  } catch (error) {
    console.error('載入 IP 白名單失敗:', error);
    ipList.innerHTML = `<li class="text-red-600">載入失敗: ${error.message}</li>`;
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
    let q = query(collection(window.db, 'checkins'), orderBy('timestamp', 'desc'), limit(20));

    // 應用篩選條件
    if (name) {
      q = query(q, where('name', '==', name));
    }
    if (location) {
      q = query(q, where('location', '==', location));
    }

    // 分頁處理
    if (direction === 'next' && lastDoc) {
      q = query(q, startAfter(lastDoc));
    } else if (direction === 'prev' && firstDoc) {
      q = query(q, startAfter(firstDoc));
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
    const totalQuery = query(collection(window.db, 'checkins'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalRecords = totalSnapshot.size;

    // 顯示記錄
    if (displayMode === 'original') {
      records.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${record.type === 'checkin' ? record.timestamp + '<br>' + record.device : '-'}</td>
          <td class="py-3 px-4 border-b">${record.type === 'checkout' ? record.timestamp + '<br>' + record.device : '-'}</td>
        `;
        checkinRecords.appendChild(row);
      });
    } else {
      // 配對模式邏輯
      const pairedRecords = pairCheckinRecords(records);
      pairedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="py-3 px-4 border-b">${record.name}</td>
          <td class="py-3 px-4 border-b">${record.location}</td>
          <td class="py-3 px-4 border-b">${record.checkin ? record.checkin.timestamp + '<br>' + record.checkin.device : '-'}</td>
          <td class="py-3 px-4 border-b">${record.checkout ? record.checkout.timestamp + '<br>' + record.checkout.device : '-'}</td>
        `;
        checkinRecords.appendChild(row);
      });
    }

    // 更新分頁資訊
    recordStart.textContent = records.length > 0 ? (direction === 'prev' ? totalRecords - records.length + 1 : 1) : 0;
    recordEnd.textContent = records.length;
    recordTotal.textContent = totalRecords;

    // 控制分頁按鈕
    prevPageBtn.disabled = !firstDoc;
    nextPageBtn.disabled = !lastDoc || records.length < 20;

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    if (error.code === 'permission-denied') {
      checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: 權限不足，請以管理員身份登入</td></tr>`;
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
