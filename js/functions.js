export async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('無法獲取 IP:', error);
    return null;
  }
}

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Unknown Device';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    device = `Apple ${/iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : 'iPod'}`;
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?(Mobile|Tablet)/i);
    device = `Android ${match ? match[1] : 'Device'}`;
  } else if (/Windows/i.test(ua)) {
    device = 'Windows Device';
  } else if (/Macintosh/i.test(ua)) {
    device = 'Mac Device';
  }
  return device;
}

export async function getIPWhitelist() {
  try {
    const snapshot = await window.db.collection('whitelist').get();
    return snapshot.docs.map(doc => doc.data().ip);
  } catch (error) {
    console.error('無法獲取 IP 白名單:', error);
    return [];
  }
}

/**
 * 檢查 IP 是否在白名單中，支援完整 IP 和前綴比對
 * @param {string} userIP - 用戶的 IP 地址
 * @param {Array<string>} whitelist - IP 白名單列表
 * @returns {boolean} - 是否在白名單中
 */
function isIPInWhitelist(userIP, whitelist) {
  if (!userIP || !whitelist || !whitelist.length) {
    return false;
  }
  
  // 檢查完整 IP 匹配
  if (whitelist.includes(userIP)) {
    return true;
  }
  
  // 檢查 IP 前綴匹配
  return whitelist.some(whitelistedIP => {
    // 如果白名單 IP 不包含完整的四個段落，視為前綴匹配
    if (whitelistedIP.split('.').length < 4) {
      return userIP.startsWith(whitelistedIP);
    }
    return false;
  });
}

export async function handleCheckin(type, name, location, lang, statusElement) {
  const translations = {
    zh: {
      success: '打卡成功！',
      fail: '打卡失敗：',
      ipError: '請登入餐廳WIFI後再進行打卡',
      inputError: '請輸入姓名和選擇地點！'
    },
    vi: {
      success: 'Chấm công thành công!',
      fail: 'Chấm công thất bại:',
      ipError: 'Vui lòng đăng nhập WiFi nhà hàng trước khi chấm công',
      inputError: 'Vui lòng nhập tên và chọn địa điểm!'
    },
    en: {
      success: 'Check-in successful!',
      fail: 'Check-in failed:',
      ipError: 'Please connect to the restaurant WiFi before checking in',
      inputError: 'Please enter name and select location!'
    }
  };

  if (!name || !location) {
    statusElement.textContent = translations[lang].inputError;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    return; // 移除自動隱藏，讓訊息持續顯示
  }

  const userIP = await getUserIP();
  const ipWhitelist = await getIPWhitelist();
  
  // 使用新的 IP 比對函數
  if (!userIP || !isIPInWhitelist(userIP, ipWhitelist)) {
    statusElement.textContent = translations[lang].ipError;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    return; // 移除自動隱藏，讓訊息持續顯示
  }

  const device = getDeviceInfo();
  const timestamp = new Date().toLocaleString('zh-TW');

  try {
    await window.db.collection('checkins').add({
      name: name,
      location: location,
      type: type,
      timestamp: timestamp,
      device: device,
      ip: userIP
    });
    statusElement.textContent = translations[lang].success;
    statusElement.classList.remove('text-red-600', 'hidden');
    statusElement.classList.add('text-green-600');
    // 成功訊息也持續顯示，不自動隱藏
  } catch (error) {
    statusElement.textContent = `${translations[lang].fail} ${error.message}`;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    // 錯誤訊息也持續顯示，不自動隱藏
  }
}
