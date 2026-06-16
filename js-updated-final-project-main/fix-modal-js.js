const fs = require('fs');

const polyfill = `
window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.setProperty('display', 'flex', 'important');
        el.classList.add('open');
    }
};
window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.setProperty('display', 'none', 'important');
        el.classList.remove('open');
    }
};
`;

const file = './apps/web/public/legacy/js/model-dsr.js';
let c = fs.readFileSync(file, 'utf8');
c = polyfill + c;
fs.writeFileSync(file, c);
console.log("Bulletproof modal functions added to model-dsr.js!");
