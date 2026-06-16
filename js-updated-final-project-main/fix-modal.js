const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/login.html', 'utf8');

if (!c.includes('function openModal(')) {
  c = c.replace('<script defer src="js/model-dsr.js"></script>', `<script>
  window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  };
  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  };
</script>
<script defer src="js/model-dsr.js"></script>`);
  fs.writeFileSync('./apps/web/public/legacy/login.html', c);
  console.log('Polyfill added');
} else {
  console.log('openModal already exists');
}
