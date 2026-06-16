const fs = require('fs');

const file = './apps/web/public/legacy/login.html';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /Save as Draft \(No Import\)<\/button>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
  'Save as Draft (No Import)</button>\n  </div>'
);

fs.writeFileSync(file, c);
console.log("Fixed layout successfully!");
