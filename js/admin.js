// 首先需要引入必要的 Firestore 函數
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// 全域變數，用於分頁控制
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
let totalRecords = 0;
let pageSize = 20;
let currentRecords = [];
let nameFilterValue = '';
let locationFilterValue = '';

// 載入 IP 白名單
export function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  
  // 使用 Firebase v9+ 模組化語法
  const whitelistCollection = collection(window.db, 'whitelist');
  getDocs(whitelistCollection).then(snapshot => {
    // 將參數名稱從 document 改為 docSnapshot，避免與全域 document 衝突
    snapshot.forEach(docSnapshot => {
      const ip = docSnapshot.data().ip;
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center p-2 border-b border-gray-200';
      li.innerHTML = `
        <span>${ip}</span>
        <div>
          <button class="edit-ip text-blue-600 hover:underline mr-2" data-id="${docSnapshot.id}" data-ip="${ip}">編輯</button>
          <button class="delete-ip text-red-600 hover:underline" data-id="${docSnapshot.id}">刪除</button>
        </div>
      `;
      ipList.appendChild(li);
    });

    document.querySelectorAll('.edit-ip').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const newIP = prompt('輸入新的 IP 位址:', button.dataset.ip);
        if (newIP) {
          try {
            // 使用 Firebase v9+ 模組化語法
            const docRef = doc(window.db, 'whitelist', id);
            await updateDoc(docRef, { ip: newIP });
            loadIPWhitelist();
          } catch (error) {
            alert('更新失敗：' + error.message);
          }
        }
      });
    });

    document.querySelectorAll('.delete-ip').forEach(button => {
      button.addEventListener('click', async () => {
        if (confirm('確定刪除此 IP？')) {
          try {
            // 使用 Firebase v9+ 模組化語法
            const docRef = doc(window.db, 'whitelist', button.dataset.id);
            await deleteDoc(docRef);
            loadIPWhitelist();
          } catch (error) {
            alert('刪除失敗：' + error.message);
          }
        }
      });
    });
  });
}

// 載入打卡紀錄
export async function loadCheckinRecords(name = '', location = '', pageDirection = 'first') {
  try {
    nameFilterValue = name;
    locationFilterValue = location;
    const recordsTable = document.getElementById('checkin-records');
    recordsTable.innerHTML = '<tr><td colspan="4" class="py-4 text-center">載入中...</td></tr>';
    
    // 建立查詢條件
    let checkinsRef = collection(window.db, 'checkins');
    let constraints = [];
    
    // 加入排序條件（依時間戳倒序）
    constraints.push(orderBy('timestamp', 'desc'));
    
    // 加入篩選條件 - 注意：如果同時使用 where 和 orderBy，需要在 Firebase 控制台建立複合索引
    if (name) {
      // 如果需要篩選姓名，建議先建立索引
      constraints.unshift(where('name', '==', name));
    }
    
    // 分頁控制
    if (pageDirection === 'next' && lastVisible) {
      constraints.push(startAfter(lastVisible));
      currentPage++;
    } else if (pageDirection === 'prev' && firstVisible && currentPage > 1) {
      // 回到第一頁
      currentPage--;
      if (currentPage === 1) {
        lastVisible = null;
        firstVisible = null;
      } else {
        // 簡化處理：重新從頭開始查詢到前一頁
        // 注意：這種方法在大量數據時效率不高，但實現簡單
        lastVisible = null;
        firstVisible = null;
        let tempQuery = query(checkinsRef, ...constraints);
        let tempSnapshot = await getDocs(tempQuery);
        let pages = Math.ceil(tempSnapshot.size / pageSize);
        currentPage = Math.min(currentPage, pages);
      }
    } else {
      // 第一頁或重新查詢
      currentPage = 1;
      lastVisible = null;
      firstVisible = null;
    }
    
    // 限制每頁記錄數
    constraints.push(limit(pageSize));
    
    // 執行查詢
    const q = query(checkinsRef, ...constraints);
    const snapshot = await getDocs(q);
    
    // 更新分頁控制變數
    if (!snapshot.empty) {
      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      firstVisible = snapshot.docs[0];
    }
    
    // 獲取總記錄數（簡化版）
    // 注意：在實際應用中，應該使用更高效的方法來計算總記錄數
    let countQuery;
    if (name) {
      countQuery = query(checkinsRef, where('name', '==', name));
    } else {
      countQuery = query(checkinsRef);
    }
    const countSnapshot = await getDocs(countQuery);
    totalRecords = countSnapshot.size;
    
    // 清空表格
    recordsTable.innerHTML = '';
    
    // 處理查詢結果
    if (snapshot.empty) {
      recordsTable.innerHTML = '<tr><td colspan="4" class="py-4 text-center">沒有找到符合條件的記錄</td></tr>';
      document.getElementById('record-start').textContent = '0';
      document.getElementById('record-end').textContent = '0';
    } else {
      // 將查詢結果轉換為陣列
      currentRecords = [];
      snapshot.forEach(doc => {
        currentRecords.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // 處理打卡記錄配對（將上班和下班記錄配對）
      const pairedRecords = pairCheckinRecords(currentRecords);
      
      // 渲染記錄
      pairedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        // 姓名
        const nameCell = document.createElement('td');
        nameCell.className = 'py-3 px-4';
        nameCell.textContent = record.name;
        row.appendChild(nameCell);
        
        // 地點
        const locationCell = document.createElement('td');
        locationCell.className = 'py-3 px-4';
        locationCell.textContent = record.location;
        row.appendChild(locationCell);
        
        // 上班時間/設備
        const checkinCell = document.createElement('td');
        checkinCell.className = 'py-3 px-4';
        if (record.checkin) {
          checkinCell.innerHTML = `
            <div>${record.checkin.timestamp}</div>
            <div class="text-xs text-gray-500">${record.checkin.device}</div>
          `;
        } else {
          checkinCell.textContent = '-';
        }
        row.appendChild(checkinCell);
        
        // 下班時間/設備
        const checkoutCell = document.createElement('td');
        checkoutCell.className = 'py-3 px-4';
        if (record.checkout) {
          checkoutCell.innerHTML = `
            <div>${record.checkout.timestamp}</div>
            <div class="text-xs text-gray-500">${record.checkout.device}</div>
          `;
        } else {
          checkoutCell.textContent = '-';
        }
        row.appendChild(checkoutCell);
        
        recordsTable.appendChild(row);
      });
      
      // 更新分頁信息
      const start = (currentPage - 1) * pageSize + 1;
      const end = Math.min(start + snapshot.size - 1, totalRecords);
      document.getElementById('record-start').textContent = start;
      document.getElementById('record-end').textContent = end;
    }
    
    // 更新總記錄數
    document.getElementById('record-total').textContent = totalRecords;
    
    // 更新分頁按鈕狀態
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage * pageSize >= totalRecords;
    
  } catch (error) {
    console.error('載入打卡紀錄失敗:', error);
    const recordsTable = document.getElementById('checkin-records');
    recordsTable.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-600">載入失敗: ${error.message}</td></tr>`;
    
    // 如果是索引錯誤，提示用戶建立索引
    if (error.message && error.message.includes('requires an index')) {
      const indexUrl = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
      if (indexUrl) {
        recordsTable.innerHTML += `
          <tr><td colspan="4" class="py-2 text-center">
            <p>需要建立 Firestore 索引，請點擊下方連結：</p>
            <a href="${indexUrl[0]}" target="_blank" class="text-blue-600 hover:underline">建立索引</a>
            <p class="mt-2 text-sm">建立索引後，請重新整理頁面</p>
          </td></tr>
        `;
      }
    }
  }
}

// 將上班和下班記錄配對
function pairCheckinRecords(records) {
  // 按姓名和日期分組
  const recordsByNameAndDate = {};
  
  records.forEach(record => {
    // 從時間戳中提取日期部分（假設格式為 "YYYY/MM/DD HH:MM:SS" 或類似格式）
    const datePart = record.timestamp.split(' ')[0];
    const key = `${record.name}-${datePart}`;
    
    if (!recordsByNameAndDate[key]) {
      recordsByNameAndDate[key] = {
        name: record.name,
        location: record.location,
        date: datePart,
        checkin: null,
        checkout: null
      };
    }
    
    // 根據打卡類型更新記錄
    if (record.type === 'checkin') {
      recordsByNameAndDate[key].checkin = {
        timestamp: record.timestamp,
        device: record.device,
        ip: record.ip
      };
    } else if (record.type === 'checkout') {
      recordsByNameAndDate[key].checkout = {
        timestamp: record.timestamp,
        device: record.device,
        ip: record.ip
      };
    }
  });
  
  // 將分組後的記錄轉換為陣列
  return Object.values(recordsByNameAndDate);
}
