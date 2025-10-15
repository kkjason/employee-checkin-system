// index3.js

// ✅ Firebase 初始化（沿用你原本的設定）
const firebaseConfig = {
  apiKey: "你的 API KEY",
  authDomain: "你的 AUTH DOMAIN",
  projectId: "你的 PROJECT ID",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const checkinBtn = document.getElementById('checkin-btn');
const welcomeText = document.getElementById('welcome-text');
const userContainer = document.getElementById('user-container');
const loginContainer = document.getElementById('login-container');
const recordList = document.getElementById('record-list');

let currentUser = null;
let lastCheckinTimestamp = 0;  // 🆕 紀錄上次打卡時間（毫秒）

// Google 登入
loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

// 登出
logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// 監聽登入狀態
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    welcomeText.textContent = `歡迎，${user.displayName}`;
    userContainer.style.display = 'block';
    loginContainer.style.display = 'none';
    loadRecords();
  } else {
    currentUser = null;
    userContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    recordList.innerHTML = '';
  }
});

// 🆕 打卡邏輯：新增「間隔檢查」功能
checkinBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  const now = Date.now();
  const interval = 30000; // 30秒內不得重複打卡

  if (now - lastCheckinTimestamp < interval) {
    alert('請勿重複打卡，請稍後再試');
    return;
  }

  try {
    await db.collection('checkins').add({
      uid: currentUser.uid,
      name: currentUser.displayName,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    lastCheckinTimestamp = now; // 📝 更新最後打卡時間
    alert('打卡成功');
    loadRecords();
  } catch (error) {
    console.error('打卡失敗', error);
    alert('打卡失敗，請稍後再試');
  }
});

// 讀取打卡紀錄（沿用原本功能）
async function loadRecords() {
  if (!currentUser) return;

  const snapshot = await db.collection('checkins')
    .where('uid', '==', currentUser.uid)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  recordList.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    const time = data.timestamp ? data.timestamp.toDate().toLocaleString('zh-TW') : '尚未同步時間';
    li.textContent = `${time} - ${data.name}`;
    recordList.appendChild(li);
  });
}
