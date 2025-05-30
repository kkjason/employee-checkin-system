const db = firebase.firestore();
const ipWhitelist = ['192.168.1.1', '203.0.113.0']; // 請替換為實際的 IP 白名單

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

async function handleCheckin(type, name, location, lang, statusElement) {
  const translations = {
    zh: {
      success: '打卡成功！',
      fail: '打卡失敗：',
      ipError: '您的 IP 不在白名單內，無法打卡！',
      inputError: '請輸入姓名和選擇地點！'
    },
    vi: {
      success: 'Chấm công thành công!',
      fail: 'Chấm công thất bại:',
      ipError: 'IP của bạn không nằm trong danh sách trắng, không thể chấm công!',
      inputError: 'Vui lòng nhập tên và chọn địa điểm!'
    },
    en: {
      success: 'Check-in successful!',
      fail: 'Check-in failed:',
      ipError: 'Your IP is not in the whitelist, cannot check-in!',
      inputError: 'Please enter name and select location!'
    }
  };

  if (!name || !location) {
    statusElement.textContent = translations[lang].inputError;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    setTimeout(() => statusElement.classList.add('hidden'), 3000);
    return;
  }

  const userIP = await getUserIP();
  if (!userIP || !ipWhitelist.includes(userIP)) {
    statusElement.textContent = translations[lang].ipError;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    setTimeout(() => statusElement.classList.add('hidden'), 3000);
    return;
  }

  const device = getDeviceInfo();
  const timestamp = new Date().toLocaleString('zh-TW');

  try {
    await db.collection('checkins').add({
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
    setTimeout(() => statusElement.classList.add('hidden'), 3000);
  } catch (error) {
    statusElement.textContent = `${translations[lang].fail} ${error.message}`;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    setTimeout(() => statusElement.classList.add('hidden'), 3000);
  }
}
