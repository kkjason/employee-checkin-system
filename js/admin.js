import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, updateDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

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

let lastDoc = null;
let firstDoc = null;
let currentPage = 0;
let currentNameFilter = '';
let currentLocationFilter = '';

// DOM 元素
const ipManagement = document.getElementById('ip-management');
const checkinManagement = document.getElementById('checkin-management');
const ipManagementBtn = document.getElementById('ip-management-btn');
const checkinManagementBtn = document.getElementById('checkin-management-btn');
const logoutBtn = document.getElementById('logout-btn');

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

// 加載打卡紀錄的函數
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

  console.log(`當前篩選條件 - 姓名: ${currentNameFilter}, 地點: ${currentLocationFilter}, 方向: ${direction}`);

  try {
    let q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(20));

    if (name) {
      q = query(q, where('name', '==', name));
    }
    if (location) {
      q = query(q, where('location', '==', location));
    }

    if (direction === 'next') {
      currentPage++;
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      } else {
        currentPage--;
        console.warn('沒有 lastDoc，回退頁碼');
      }
    } else if (direction === 'prev') {
      if (currentPage > 0) {
        currentPage--;
        if (currentPage === 0) {
          q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'), limit(20));
        } else {
          q = query(q, startAfter(firstDoc));
        }
      }
    }

    console.log(`當前頁碼: ${currentPage}`);

    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    if (records.length > 0) {
      lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstDoc = querySnapshot.docs[0];
      console.log(`加載 ${records.length} 條記錄`);
    } else {
      lastDoc = null;
      firstDoc = null;
      console.warn('沒有找到記錄');
    }

    const totalQuery = query(collection(db, 'checkins'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalRecords = totalSnapshot.size;

    records.forEach(record => {
      const row = document.createElement('tr');
      const checkinTime = new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
      row.innerHTML = `
        <td class="py-3 px-4 border-b">${record.name}</td>
        <td class="py-3 px-4 border-b">${record.location}</td>
        <td class="py-3 px-4 border-b">${record.type === 'checkin' ? `${checkinTime}<br>${record.device}` : '-'}</td>
        <td class="py-3 px-4 border-b">${record.type === 'checkout' ? `${checkinTime}<br>${record.device}` : '-'}</td>
      `;
      checkinRecords.appendChild(row);
    });

    recordStart.textContent = (currentPage * 20) + 1;
    recordEnd.textContent = Math.min((currentPage + 1) * 20, totalRecords);
    recordTotal.textContent = totalRecords;

    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = !lastDoc || records.length < 20;

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${error.message}</td></tr>`;
  }
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
    if (error.code === 'permission-denied') {
      ipList.innerHTML = `<li class="text-red-600">載入失敗: 權限不足，請確認您是管理員</li>`;
    } else {
      ipList.innerHTML = `<li class="text-red-600">載入失敗: ${error.message}</li>`;
    }
  }
}
