import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc, getFirestore, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

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

// DOM 元素
const checkinManagement = document.getElementById('checkin-management');
const logoutBtn = document.getElementById('logout-btn');
const nameFilter = document.getElementById('name-filter');
const locationFilter = document.getElementById('location-filter');
const searchBtn = document.getElementById('search-btn');
const checkinRecords = document.getElementById('checkin-records');

// 等待 DOM 載入完成
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('用戶 UID:', user.uid, '電子郵件:', user.email);
      document.getElementById('admin-container').classList.remove('hidden');
      checkinManagement.classList.remove('hidden');
      await loadCheckinRecords();
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
export async function loadCheckinRecords(name = '', location = '', startDate = '', endDate = '') {
  try {
    let q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));

    // 應用篩選條件
    if (name) q = query(q, where('name', '==', name));
    if (location) q = query(q, where('location', '==', location));
    if (startDate) q = query(q, where('timestamp', '>=', new Date(startDate).getTime()));
    if (endDate) q = query(q, where('timestamp', '<=', new Date(endDate).setHours(23, 59, 59, 999)));

    const querySnapshot = await getDocs(q);
    let records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    // 整合紀錄
    const consolidatedRecords = {};
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const key = `${record.name}_${date.toISOString().split('T')[0]}`;
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

    // 處理跨日的情況
    const finalRecords = [];
    for (const key in consolidatedRecords) {
      const record = consolidatedRecords[key];
      if (record.checkin && record.checkout) {
        const checkinDate = new Date(record.checkin.timestamp);
        const checkoutDate = new Date(record.checkout.timestamp);
        
        // 如果上班時間在前一天的晚上，則將其視為跨日
        if (checkinDate.getDate() ![== checkoutDate.getDate]()) {
          checkinDate.setDate(checkinDate.getDate() - 1);
        }

        finalRecords.push({
          name: record.name,
          location: record.location,
          checkin: checkinDate,
          checkout: checkoutDate
        });
      }
    }

    // 渲染記錄
    checkinRecords.innerHTML = '';
    finalRecords.forEach(record => {
      const checkinTime = record.checkin.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
      const checkoutTime = record.checkout.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-3 px-4 border-b">${record.name}</td>
        <td class="py-3 px-4 border-b">${record.location}</td>
        <td class="py-3 px-4 border-b">${checkinTime}</td>
        <td class="py-3 px-4 border-b">${checkoutTime}</td>
      `;
      checkinRecords.appendChild(row);
    });

  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    checkinRecords.innerHTML = `<tr><td colspan="4" class="py-3 px-4 text-red-600 text-center">載入失敗: ${error.message}</td></tr>`;
  }
}
