const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/js/model-dsr.js', 'utf8');

c = c.replace(/async function uploadModelDsr\(\) \{/, 'window.uploadModelDsr = async function uploadModelDsr() {');
c = c.replace(/async function executeRollback\(\) \{/, 'window.executeRollback = async function executeRollback() {');

// remove the strict file required check so the user can easily test
c = c.replace(/if \(\!currentModelDsrFile\) return alert\('Please select a document to upload.'\);/, '// file not strictly required for test if (!currentModelDsrFile) ...');
c = c.replace(/if \(\!currentModelDsrName\) return alert\('Please enter a name for the Model DSR.'\);/, 'if (!currentModelDsrName) currentModelDsrName = "Test DSR";');

fs.writeFileSync('./apps/web/public/legacy/js/model-dsr.js', c);
console.log("Functions exposed to window and validations relaxed!");
