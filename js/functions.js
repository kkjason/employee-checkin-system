const db = firebase.firestore();
const ipWhitelist = ['192.168.1.1', '203.0.113.0']; // 替換為您的 IP 白名單

async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('無法獲取 IP:', error);
    return null;
  }
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = '未知設備';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    device = 'Apple 設備';
  } else if (/Android/i.test(ua)) {
    device = 'Android 設備';
  } else if (/Windows/i.test(ua)) {
    device = 'Windows 設備';
  } else if (/Macintosh/i.test(ua)) {
    device = 'Mac 設備';
  }
  return device;
}

async function handleCheckin(type) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('請先登入！');
    return;
  }

  const name = document.getElementById('name').value;
  const location = document.getElementById('location').value;
  if (!name || !location) {
    alert('請輸入姓名和選擇地點！');
    return;
  }

  const userIP = await getUserIP();
  if (!userIP || !ipWhitelist.includes(userIP)) {
    alert('您的 IP 不在白名單內，無法打卡！');
    return;
  }

  const device = getDeviceInfo();
  const timestamp = new Date().toLocaleString('zh-TW');

  try {
    await db.collection('checkins').add({
      userId: user.uid,
      name: name,
      location: location,
      type: type,
      timestamp: timestamp,
      device: device,
      ip: userIP
    });
    alert(type === 'checkin' ? '上班打卡成功！' : '下班打卡成功！');
    loadCheckinRecords(user.uid);
  } catch (error) {
    alert('打卡失敗：' + error.message);
  }
}