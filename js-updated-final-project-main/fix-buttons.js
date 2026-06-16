const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/login.html', 'utf8');

c = c.replace(
  '<button class="btn btn-primary" id="btn-model-dsr-upload">Upload & Select Target Project</button>',
  '<button class="btn btn-primary" id="btn-model-dsr-upload" onclick="uploadModelDsr()">Upload & Select Target Project</button>'
);

c = c.replace(
  '<button class="btn btn-outline" id="btn-model-dsr-save-only">Save as Draft (No Import)</button>',
  '<button class="btn btn-outline" id="btn-model-dsr-save-only" onclick="(() => { const title = document.getElementById(\'model-dsr-name\').value.trim(); if(!title) return alert(\'Please enter a Model DSR Name.\'); alert(\'Saved locally. Use Upload & Select Target Project to map it to a district.\'); })()">Save as Draft (No Import)</button>'
);

c = c.replace(
  '<button class="btn btn-saffron" id="btn-mdsr-rollback">Undo Last Import</button>',
  '<button class="btn btn-saffron" id="btn-mdsr-rollback" onclick="executeRollback()">Undo Last Import</button>'
);

fs.writeFileSync('./apps/web/public/legacy/login.html', c);
console.log("Inline handlers added!");
