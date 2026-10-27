// يولّد integrity.json: بصمات SHA-256 للأصول المجمّدة (أسئلة، كتاب/دروس، مخطط البيانات). شغّليه مرة واحدة على النسخة الأصلية.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const frozen = ['js/questions.js', 'js/review.js', 'js/forms.js', 'js/rules.js', 'js/tracker.js', ...fs.readdirSync(path.join(root, 'lessons')).map(f => 'lessons/' + f)];
const out = { note: 'أصول مجمّدة: أي تغيير فيها يوقف النشر حتى تراجعه المعلمة', createdFrom: path.basename(root), files: {} };
frozen.forEach(f => out.files[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex'));
fs.writeFileSync(path.join(__dirname, '..', 'integrity.json'), JSON.stringify(out, null, 2));
console.log('wrote integrity.json for', frozen.length, 'files');
