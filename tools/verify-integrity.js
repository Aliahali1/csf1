// يتحقق أن الأصول المجمّدة لم تتغير. الخروج برمز 1 عند أي اختلاف.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), man = JSON.parse(fs.readFileSync(path.join(root, 'integrity.json'), 'utf8'));
let bad = 0;
for (const [f, h] of Object.entries(man.files)) {
  const p = path.join(root, f);
  const cur = fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'MISSING';
  if (cur !== h) { bad++; console.log('✗ تغيّر:', f); } 
}
console.log(bad ? `فشل: ${bad} ملف تغيّر` : `نجح: ${Object.keys(man.files).length} أصلًا مجمّدًا سليمة`);
process.exit(bad ? 1 : 0);
