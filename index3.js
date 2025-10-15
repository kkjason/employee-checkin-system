// index3.js
// 初始化 Firebase
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
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const recordsList = document.getElementById('records-list');

let currentUser = null;
let lastCheckinTime = 0; // 儲存上次打卡時間（毫秒）

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
    userInfoDiv.style.display = 'block';
    loginBtn.style.display = 'none';
    userNameSpan.textContent = user.displayName;

    // 載入最近4筆紀錄
    loadRecentRecords();
  } else {
    currentUser = null;
    userInfoDiv.style.display = 'none';
    loginBtn.style.display = 'block';
    recordsList.innerHTML = '';
  }
});

// 打卡按鈕
checkinBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  const now = Date.now();
  if (now - lastCheckinTime < 30000) { // 30 秒內不得再次打卡
    alert('請勿連續重複打卡，請稍後再試。');
    return;
  }

  try {
    await db.collection('checkins').add({
      uid: currentUser.uid,
      name: currentUser.displayName,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    lastCheckinTime = now;
    alert('打卡成功！');

    // 更新畫面上的最近紀錄
    loadRecentRecords();
  } catch (error) {
    console.error('打卡失敗', error);
  }
});

// 載入最近4筆打卡紀錄
async function loadRecentRecords() {
  if (!currentUser) return;

  const snapshot = await db.collection('checkins')
    .where('uid', '==', currentUser.uid)
    .orderBy('timestamp', 'desc')
    .limit(4)
    .get();

  recordsList.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    const ts = data.timestamp?.toDate().toLocaleString('zh-TW') || '尚未同步時間';
    li.textContent = `${ts} - ${data.name}`;
    recordsList.appendChild(li);
  });
}
