export function loadIPWhitelist() {
  const ipList = document.getElementById('ip-list');
  ipList.innerHTML = '';
  window.db.collection('whitelist').get().then(snapshot => {
    snapshot.forEach(doc => {
      const ip = doc.data().ip;
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center p-2 border-b border-gray-200';
      li.innerHTML = `
        <span>${ip}</span>
        <div>
          <button class="edit-ip text-blue-600 hover:underline mr-2" data-id="${doc.id}" data-ip="${ip}">編輯</button>
          <button class="delete-ip text-red-600 hover:underline" data-id="${doc.id}">刪除</button>
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
            await window.db.collection('whitelist').doc(id).update({ ip: newIP });
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
            await window.db.collection('whitelist').doc(button.dataset.id).delete();
            loadIPWhitelist();
          } catch (error) {
            alert('刪除失敗：' + error.message);
          }
        }
      });
    });
  });
}
