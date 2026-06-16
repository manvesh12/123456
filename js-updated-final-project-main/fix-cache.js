const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/login.html', 'utf8');

c = c.replace(/href="css\/styles\.css(\?v=[a-z0-9]+)?"/, 'href="css/styles.css?v=' + Date.now() + '"');

fs.writeFileSync('./apps/web/public/legacy/login.html', c);
console.log("Cache buster added to styles.css!");
