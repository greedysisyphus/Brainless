const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const months = [31,28,31,30,31,30,31,31,30,31,30,31];
// 使用新的中央店模板
const templatePath = path.join(__dirname, '../public/reports/Central_temple.numbers');
const outDir = path.join(__dirname, '../public/reports');

if (!fs.existsSync(templatePath)) {
  console.error('找不到 Central_temple.numbers');
  process.exit(1);
}
const template = fs.readFileSync(templatePath);

(async () => {
  for(let m=1; m<=12; m++) {
    const zip = new JSZip();
    for(let d=1; d<=months[m-1]; d++) {
      const name = `桃機日結表 ${m}-${d}.numbers`;
      // 直接複製原始檔案，不修改內容
      zip.file(name, Buffer.from(template));
    }
    const content = await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    const zipName = `DailyReport_${m}_Month.zip`;
    fs.writeFileSync(path.join(outDir, zipName), content);
    console.log(`已產生: ${zipName}`);
  }
  console.log('所有中央店報表已生成完成！');
})();