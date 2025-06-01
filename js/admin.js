<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>員工打卡系統管理</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/UAParser.js/0.7.28/ua-parser.min.js"></script>
</head>
<body class="bg-gradient-to-r from-blue-100 to-indigo-100 min-h-screen p-4">
  <div class="container mx-auto">
    <!-- 管理頁面容器 -->
    <div id="admin-container" class="hidden">
      <!-- 頁面標題 -->
      <h1 class="text-3xl font-bold text-indigo-700 mb-6 text-center">員工打卡系統管理</h1>

      <!-- 按鈕區域 -->
      <div class="flex justify-center mb-6">
        <button id="ip-management-btn" class="mx-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">IP 管理</button>
        <button id="checkin-management-btn" class="mx-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">打卡列表</button>
      </div>

      <!-- IP 白名單管理區塊 -->
      <div id="ip-management" class="bg-white p-6 rounded-xl shadow-lg hidden">
        <h2 class="text-2xl font-bold text-indigo-700 mb-4">IP 白名單管理</h2>
        <div class="space-y-4">
          <input id="ip-input" type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="輸入 IP 位址 (例如 192.168.1.1)">
          <button id="add-ip-btn" class="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">新增 IP</button>
          <h3 class="text-xl font-semibold text-indigo-700 mt-4">IP 白名單列表</h3>
          <ul id="ip-list" class="space-y-2 max-h-96 overflow-y-auto"></ul>
        </div>
      </div>

      <!-- 打卡紀錄列表區塊 -->
      <div id="checkin-management" class="bg-white p-6 rounded-xl shadow-lg hidden">
        <h2 class="text-2xl font-bold text-indigo-700 mb-4">打卡紀錄查詢</h2>
        <div class="space-y-4">
          <div class="flex gap-2">
            <input id="name-filter" type="text" class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="依姓名篩選">
            <select id="location-filter" class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">所有地點</option>
              <option value="宏匯">宏匯</option>
            </select>
          </div>
          <button id="search-btn" class="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200">查詢</button>
        </div>

        <!-- 打卡紀錄列表 -->
        <div class="mt-6">
          <h2 class="text-2xl font-bold text-indigo-700">打卡紀錄列表</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
              <thead class="bg-gray-100">
                <tr>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">姓名</th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">地點</th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">上班時間/設備</th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">下班時間/設備</th>
                </tr>
              </thead>
              <tbody id="checkin-records">
                <!-- 打卡紀錄將由 JavaScript 動態生成 -->
              </tbody>
            </table>
          </div>

          <!-- 分頁控制 -->
          <div class="mt-4 flex justify-between items-center">
            <div class="text-sm text-gray-600">
              顯示 <span id="record-start">1</span> - <span id="record-end">20</span> 筆，共 <span id="record-total">0</span> 筆
            </div>
            <div class="flex gap-2">
              <button id="prev-page" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">上一頁</button>
              <button id="next-page" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">下一頁</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 登出按鈕 -->
      <div class="mt-6 text-center">
        <button id="logout-btn" class="inline-block bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors duration-200">登出</button>
        <a href="/index.html" class="ml-4 text-indigo-600 hover:underline">返回打卡頁面</a>
      </div>
    </div>
  </div>

  <script type="module" src="/js/admin.js"></script>
</body>
</html>
