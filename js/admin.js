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
    let q = collection(window.db, 'checkins');
    let constraints = [];
    
    // 加入篩選條件
    if (name) {
      constraints.push(where('name', '==', name));
    }
    if (location) {
      constraints.push(where('location', '==', location));
    }
    
    // 加入排序條件（依時間戳倒序）
    constraints.push(orderBy('timestamp', 'desc'));
    
    // 分頁控制
    if (pageDirection === 'next' && lastVisible) {
      constraints.push(startAfter(lastVisible));
      currentPage++;
    } else if (pageDirection === 'prev' && firstVisible) {
      // 獲取前一頁的資料需要重新查詢
      currentPage--;
      // 這裡的邏輯需要更複雜的實現，簡化版是重新從頭開始查詢
      if (currentPage === 1) {
        // 如果是回到第一頁，直接重置
        lastVisible = null;
        firstVisible = null;
      } else {
        // 這裡簡化處理，實際上需要更複雜的邏輯來獲取前一頁
        // 在實際應用中，可能需要保存每一頁的第一條記錄
        lastVisible = null;
        firstVisible = null;
        for (let i = 1; i < currentPage; i++) {
          const tempQuery = query(q, ...constraints, limit(pageSize));
          const tempSnapshot = await getDocs(tempQuery);
          if (!tempSnapshot.empty) {
            lastVisible = tempSnapshot.docs[tempSnapshot.docs.length - 1];
          }
        }
        constraints.push(startAfter(lastVisible));
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
    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    
    // 更新分頁控制變數
    if (!snapshot.empty) {
      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      firstVisible = snapshot.docs[0];
    }
    
    // 獲取總記錄數（簡化版，實際應用可能需要更複雜的計數方法）
    const countQuery = query(collection(window.db, 'checkins'));
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
