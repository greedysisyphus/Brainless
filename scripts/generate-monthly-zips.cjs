const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const months = [31,28,31,30,31,30,31,31,30,31,30,31];
const templatePath = path.join(__dirname, '../public/reports/template.numbers');
const outDir = path.join(__dirname, '../public/reports');

if (!fs.existsSync(templatePath)) {
  console.error('找不到 template.numbers');
  process.exit(1);
}
const template = fs.readFileSync(templatePath);

(async () => {
  for(let m=1; m<=12; m++) {
    const zip = new JSZip();
    for(let d=1; d<=months[m-1]; d++) {
      const name = `桃機日結表 ${m}-${d}.numbers`;
      zip.file(name, Buffer.from(template));
    }
    const content = await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    const zipName = `DailyReport_${m}_Month.zip`;
    fs.writeFileSync(path.join(outDir, zipName), content);
    console.log(`已產生: ${zipName}`);
  }
})();