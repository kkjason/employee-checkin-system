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
    // 處理 ISO 格式（例如 "2025-06-02T07:

System: * Today's date and time is 08:54 PM CST on Thursday, July 10, 2025.
