import { collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export async function getUserIPs() {
  const ipList = [];
  
  // 方法1: 使用 ipify API 獲取公共 IP
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    if (data.ip) {
      ipList.push(data.ip);
    }
  } catch (error) {
    console.error('無法從 ipify 獲取 IP:', error);
  }
  
  // 方法2: 使用 db-ip API 作為備份
  try {
    const response = await fetch('https://api.db-ip.com/v2/free/self');
    const data = await response.json();
    if (data.ipAddress && !ipList.includes(data.ipAddress)) {
      ipList.push(data.ipAddress);
    }
  } catch (error) {
    console.error('無法從 db-ip 獲取 IP:', error);
  }
  
  // 方法3: 使用 WebRTC 獲取 IP（如果可用）
  try {
    const rtcIPs = await getWebRTCIPs();
    rtcIPs.forEach(ip => {
      if (!ipList.includes(ip)) {
        ipList.push(ip);
      }
    });
  } catch (error) {
    console.error('無法通過 WebRTC 獲取 IP:', error);
  }
  
  console.log('收集到的 IP 列表:', ipList);
  return ipList;
}

// 使用 WebRTC 獲取 IP 地址
function getWebRTCIPs() {
  return new Promise((resolve, reject) => {
    const ips = [];
    
    // 檢查瀏覽器是否支持 RTCPeerConnection
    if (!window.RTCPeerConnection) {
      return resolve(ips); // 如果不支持，返回空列表
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    
    // 設置超時，避免無限等待
    const timeout = setTimeout(() => {
      pc.close();
      resolve(ips);
    }, 5000);
    
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      
      // 從候選項中提取 IP 地址
      const match = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      if (match) {
        const ip = match[1];
        // 過濾私有 IP 和已收集的 IP
        if (!ips.includes(ip) && !isPrivateIP(ip)) {
          ips.push(ip);
        }
      }
    };
    
    pc.createDataChannel("");
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => {
        clearTimeout(timeout);
        pc.close();
        reject(err);
      });
    
    // 當收集完成或超時時
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.close();
        resolve(ips);
      }
    };
  });
}

// 檢查是否為私有 IP
function isPrivateIP(ip) {
  // 檢查常見的私有 IP 範圍
  return /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(ip);
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
    const whitelistCollection = collection(window.db, 'whitelist');
    const snapshot = await getDocs(whitelistCollection);
    return snapshot.docs.map(doc => doc.data().ip);
  } catch (error) {
    console.error('無法獲取 IP 白名單:', error);
    if (error.code === 'permission-denied') {
      throw new Error('無法訪問 IP 白名單，請聯繫管理員檢查 Firestore 權限設置');
    }
    throw error;
  }
}

/**
 * 檢查任一 IP 是否在白名單中，支援完整 IP 和前綴比對
 * @param {Array<string>} userIPs - 用戶的 IP 地址列表
 * @param {Array<string>} whitelist - IP 白名單列表
 * @returns {boolean} - 是否在白名單中
 */
function isAnyIPInWhitelist(userIPs, whitelist) {
  if (!userIPs || !userIPs.length || !whitelist || !whitelist.length) {
    return false;
  }
  
  // 檢查每個用戶 IP
  return userIPs.some(userIP => {
    // 檢查完整 IP 匹配
    if (whitelist.includes(userIP)) {
      console.log(`IP ${userIP} 完全匹配白名單`);
      return true;
    }
    
    // 檢查 IP 前綴匹配
    const prefixMatch = whitelist.some(whitelistedIP => {
      // 如果白名單 IP 不包含完整的四個段落，視為前綴匹配
      if (whitelistedIP.split('.').length < 4) {
        const isMatch = userIP.startsWith(whitelistedIP);
        if (isMatch) {
          console.log(`IP ${userIP} 前綴匹配白名單項 ${whitelistedIP}`);
        }
        return isMatch;
      }
      return false;
    });
    
    return prefixMatch;
  });
}

export async function handleCheckin(type, name, location, lang, statusElement) {
  const translations = {
    zh: {
      success: '打卡成功！',
      fail: '打卡失敗：',
      ipError: '請登入餐廳WIFI後再進行打卡',
      inputError: '請輸入姓名和選擇地點！',
      checking: '正在檢查網路連線...',
      permissionError: '權限錯誤：請聯繫管理員檢查 Firestore 設置'
    },
    vi: {
      success: 'Chấm công thành công!',
      fail: 'Chấm công thất bại:',
      ipError: 'Vui lòng đăng nhập WiFi nhà hàng trước khi chấm công',
      inputError: 'Vui lòng nhập tên và chọn địa điểm!',
      checking: 'Đang kiểm tra kết nối mạng...',
      permissionError: 'Lỗi quyền hạn: Vui lòng liên hệ quản trị viên để kiểm tra cài đặt Firestore'
    },
    en: {
      success: 'Check-in successful!',
      fail: 'Check-in failed:',
      ipError: 'Please connect to the restaurant WiFi before checking in',
      inputError: 'Please enter name and select location!',
      checking: 'Checking network connection...',
      permissionError: 'Permission error: Please contact the administrator to check Firestore settings'
    }
  };

  if (!name || !location) {
    statusElement.textContent = translations[lang].inputError;
    statusElement.classList.remove('text-green-600', 'hidden');
    statusElement.classList.add('text-red-600');
    return;
  }

  // 顯示檢查中的訊息
  statusElement.textContent = translations[lang].checking;
  statusElement.classList.remove('text-green-600', 'text-red-600', 'hidden');
  statusElement.classList.add('text-blue-600');

  // 獲取多個來源的 IP 列表
  const userIPs = await getUserIPs();
  let ipWhitelist;
  try {
    ipWhitelist = await getIPWhitelist();
  } catch (error) {
    statusElement.textContent = `${translations[lang].fail} ${error.message}`;
    statusElement.classList.remove('text-green-600', 'text-blue-600', 'hidden');
    statusElement.classList.add('text-red-600');
    return;
  }
  
  // 使用新的多 IP 比對函數
  if (!userIPs.length || !isAnyIPInWhitelist(userIPs, ipWhitelist)) {
    statusElement.textContent = translations[lang].ipError;
    statusElement.classList.remove('text-green-600', 'text-blue-600', 'hidden');
    statusElement.classList.add('text-red-600');
    return;
  }

  const device = getDeviceInfo();
  const timestamp = new Date().toLocaleString('zh-TW');

  try {
    await addDoc(collection(window.db, 'checkins'), {
      name: name,
      location: location,
      type: type,
      timestamp: timestamp,
      device: device,
      ips: userIPs // 儲存所有檢測到的 IP，方便後續分析
    });
    statusElement.textContent = translations[lang].success;
    statusElement.classList.remove('text-red-600', 'text-blue-600', 'hidden');
    statusElement.classList.add('text-green-600');
  } catch (error) {
    console.error('打卡失敗:', error);
    if (error.code === 'permission-denied') {
      statusElement.textContent = `${translations[lang].fail} ${translations[lang].permissionError}`;
    } else {
      statusElement.textContent = `${translations[lang].fail} ${error.message}`;
    }
    statusElement.classList.remove('text-green-600', 'text-blue-600', 'hidden');
    statusElement.classList.add('text-red-600');
  }
}
