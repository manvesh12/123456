const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/js/model-dsr.js', 'utf8');

c = c.replace(/const filtered = data\.data\.filter\(/g, "const filtered = (data.data || data).filter(");

fs.writeFileSync('./apps/web/public/legacy/js/model-dsr.js', c);
console.log("Fixed undefined filter property!");
