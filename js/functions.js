// 首先需要引入必要的 Firestore 函數
import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

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
    const whitelistCollection = collection(window.db, 'whitelist');
    const snapshot = await getDocs(whitelistCollection);
    return snapshot.docs.map(doc => doc.data().ip);
  } catch (error) {
    console.error('無法獲取 IP 白名單:', error);
    return [];
  }
}

// 檢查是否有同一天的上班打卡記錄
export async function checkTodayCheckin(name, location) {
  try {
    // 獲取今天的日期（YYYY/MM/DD 格式）
    const today = new Date().toLocaleDateString('zh-TW');
    
    // 查詢今天的上班打卡記錄
    const checkinsCollection = collection(window.db, 'checkins');
    const q = query(
      checkinsCollection,
      where('name', '==', name),
      where('location', '==', location),
      where('type', '==', 'checkin')
    );
    
    const snapshot = await getDocs(q);
    
    // 過濾出今天的記錄
    const todayCheckins = snapshot.docs.filter(doc => {
      const timestamp = doc.data().timestamp;
      return timestamp.includes(today);
    });
    
    // 如果有今天的上班打卡記錄，返回第一條記錄
    if (todayCheckins.length > 0) {
      return {
        exists: true,
        data: todayCheckins[0].data(),
        id: todayCheckins[0].id
      };
    }
    
    // 檢查是否為大夜班（昨天晚上的打卡）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('zh-TW');
    
    // 查詢昨天晚上 18:00 之後的上班打卡
    const nightShiftCheckins = snapshot.docs.filter(doc => {
      const timestamp = doc.data().timestamp;
      if (!timestamp.includes(yesterdayStr)) return false;
      
      // 解析時間部分
      const timePart = timestamp.split(' ')[1];
      const hour = parseInt(timePart.split(':')[0]);
      
      // 如果是下午/晚上 6 點之後打卡，視為大夜班
      return hour >= 18;
    });
    
    if (nightShiftCheckins.length > 0) {
      return {
        exists: true,
        data: nightShiftCheckins[0].data(),
        id: nightShiftCheckins[0].id,
        isNightShift: true
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('檢查今日打卡記錄失敗:', error);
    return { exists: false, error: error.message };
  }
}

export async function handleCheckin(type, name, location, lang, statusElement) {
  const translations = {
    zh: {
      success: '打卡成功！',
      fail: '打卡失敗：',
      ipError: '您的 IP 不在白名單內，無法打卡！',
      inputError: '請輸入姓名和選擇地點！',
      noCheckinRecord: '找不到今天的上班打卡記錄，是否忘記上班打卡？',
      confirmCheckout: '確認直接下班打卡',
      cancelCheckout: '取消',
      nightShiftCheckin: '大夜班上班打卡記錄已存在，將記錄為大夜班下班打卡',
      checkinTime: '上班時間：',
      checkoutTime: '下班時間：'
    },
    vi: {
      success: 'Chấm công thành công!',
      fail: 'Chấm công thất bại:',
      ipError: 'IP của bạn không nằm trong danh sách trắng, không thể chấm công!',
      inputError: 'Vui lòng nhập tên và chọn địa điểm!',
      noCheckinRecord: 'Không tìm thấy bản ghi chấm công vào hôm nay, bạn có quên chấm công vào không?',
      confirmCheckout: 'Xác nhận chấm công ra',
      cancelCheckout: 'Hủy',
      nightShiftCheckin: 'Đã tồn tại bản ghi chấm công vào ca đêm, sẽ được ghi nhận là chấm công ra ca đêm',
      checkinTime: 'Thời gian vào:',
      checkoutTime: 'Thời gian ra:'
    },
    en: {
      success: 'Check-in successful!',
      fail: 'Check-in failed:',
      ipError: 'Your IP is not in the whitelist, cannot check-in!',
      inputError: 'Please enter name and select location!',
      noCheckinRecord: 'No check-in record found for today, did you forget to check in?',
      confirmCheckout: 'Confirm check-out',
      cancelCheckout: 'Cancel',
      nightShiftCheckin: 'Night shift check-in record exists, will record as night shift check-out',
      checkinTime: 'Check-in time:',
      checkoutTime: 'Check-out time:'
    }
  };

  // 清除之前的狀態訊息
  statusElement.textContent = '';
  statusElement.className = 'mt-4 text-center font-medium';

  if (!name || !location) {
    statusElement.textContent = translations[lang].inputError;
    statusElement.classList.remove('hidden', 'text-green-600');
    statusElement.classList.add('text-red-600');
    return;
  }

  const userIP = await getUserIP();
  const ipWhitelist = await getIPWhitelist();
  if (!userIP || !ipWhitelist.includes(userIP)) {
    statusElement.textContent = translations[lang].ipError;
    statusElement.classList.remove('hidden', 'text-green-600');
    statusElement.classList.add('text-red-600');
    return;
  }

  const device = getDeviceInfo();
  const timestamp = new Date().toLocaleString('zh-TW');

  try {
    // 如果是下班打卡，檢查是否有今天的上班打卡記錄
    if (type === 'checkout') {
      const todayCheckin = await checkTodayCheckin(name, location);
      
      if (!todayCheckin.exists) {
        // 沒有找到上班打卡記錄，顯示確認對話框
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'mt-4 p-4 bg-yellow-100 rounded-lg';
        confirmDiv.innerHTML = `
          <p class="text-yellow-800 mb-2">${translations[lang].noCheckinRecord}</p>
          <div class="flex justify-center gap-2">
            <button id="confirm-checkout" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">${translations[lang].confirmCheckout}</button>
            <button id="cancel-checkout" class="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500">${translations[lang].cancelCheckout}</button>
          </div>
        `;
        
        statusElement.innerHTML = '';
        statusElement.classList.remove('hidden');
        statusElement.appendChild(confirmDiv);
        
        // 綁定確認和取消按鈕事件
        document.getElementById('confirm-checkout').addEventListener('click', async () => {
          // 直接進行下班打卡
          await addCheckinRecord(type, name, location, timestamp, device, userIP, null, statusElement, translations, lang);
        });
        
        document.getElementById('cancel-checkout').addEventListener('click', () => {
          statusElement.innerHTML = '';
          statusElement.classList.add('hidden');
        });
        
        return;
      }
      
      // 有上班打卡記錄，進行下班打卡並關聯到上班記錄
      await addCheckinRecord(type, name, location, timestamp, device, userIP, todayCheckin, statusElement, translations, lang);
      return;
    }
    
    // 上班打卡，直接記錄
    await addCheckinRecord(type, name, location, timestamp, device, userIP, null, statusElement, translations, lang);
  } catch (error) {
    statusElement.textContent = `${translations[lang].fail} ${error.message}`;
    statusElement.classList.remove('hidden', 'text-green-600');
    statusElement.classList.add('text-red-600');
  }
}

// 新增打卡記錄
async function addCheckinRecord(type, name, location, timestamp, device, userIP, todayCheckin, statusElement, translations, lang) {
  try {
    const checkinsCollection = collection(window.db, 'checkins');
    
    // 準備打卡資料
    const checkinData = {
      name: name,
      location: location,
      type: type,
      timestamp: timestamp,
      device: device,
      ip: userIP
    };
    
    // 如果是下班打卡且有上班記錄，添加關聯
    if (type === 'checkout' && todayCheckin) {
      checkinData.checkinId = todayCheckin.id;
      checkinData.checkinTime = todayCheckin.data.timestamp;
      checkinData.isNightShift = todayCheckin.isNightShift || false;
    }
    
    // 新增打卡記錄
    await addDoc(checkinsCollection, checkinData);
    
    // 顯示成功訊息
    let successMessage = translations[lang].success;
    
    // 如果是下班打卡且有上班記錄，顯示上班和下班時間
    if (type === 'checkout' && todayCheckin) {
      if (todayCheckin.isNightShift) {
        successMessage = `${translations[lang].nightShiftCheckin}<br>`;
      }
      
      successMessage += `
        <div class="mt-2 text-left">
          <p>${translations[lang].checkinTime} ${todayCheckin.data.timestamp}</p>
          <p>${translations[lang].checkoutTime} ${timestamp}</p>
        </div>
      `;
    }
    
    statusElement.innerHTML = successMessage;
    statusElement.classList.remove('hidden', 'text-red-600');
    statusElement.classList.add('text-green-600');
  } catch (error) {
    throw error;
  }
}
