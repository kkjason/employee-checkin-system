import fs from 'fs';
import path from 'path';

const filePath = path.resolve('data/checkins.json');

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
  }

  const { name } = await req.json();
  if (!name) {
    return new Response(JSON.stringify({ message: '缺少姓名' }), { status: 400 });
  }

  let records = [];
  if (fs.existsSync(filePath)) {
    records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // 防止短時間連打（60秒）
  const now = Date.now();
  const lastRecord = records.find(r => r.name === name);
  if (lastRecord && now - new Date(lastRecord.time).getTime() < 60 * 1000) {
    return new Response(JSON.stringify({ message: '請稍等 60 秒再打卡' }), { status: 429 });
  }

  const newRecord = { name, time: new Date().toISOString() };
  records.unshift(newRecord); // 放最前面

  fs.writeFileSync(filePath, JSON.stringify(records, null, 2));

  return new Response(JSON.stringify({ message: '打卡成功！' }), { status: 200 });
};
