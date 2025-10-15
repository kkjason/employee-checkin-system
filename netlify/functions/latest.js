import fs from 'fs';
import path from 'path';

const filePath = path.resolve('data/checkins.json');

export default async (req, context) => {
  let records = [];
  if (fs.existsSync(filePath)) {
    records = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  const latest = records.slice(0, 4);
  return new Response(JSON.stringify(latest), {
    headers: { 'Content-Type': 'application/json' }
  });
};
