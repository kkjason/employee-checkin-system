// 首先需要引入必要的 Firestore 函數
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  
  // 修正: 使用 Firebase v9+ 模組化語法
  const whitelistCollection = collection(window.db, 'whitelist');
  getDocs(whitelistCollection).then(snapshot => {
    // 修正: 將參數名稱從 document 改為 docSnapshot，避免與全域 document 衝突
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
            // 修正: 使用 Firebase v9+ 模組化語法
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
            // 修正: 使用 Firebase v9+ 模組化語法
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
