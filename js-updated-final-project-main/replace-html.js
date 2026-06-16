const fs = require('fs');

let c = fs.readFileSync('./apps/web/public/legacy/login.html', 'utf8');
const replacement = `<div style="display:flex; gap:12px; margin-top:8px;">
  <button class="btn btn-primary" id="btn-model-dsr-upload">Upload & Select Target Project</button>
  <button class="btn btn-outline" id="btn-model-dsr-save-only">Save as Draft (No Import)</button>
</div>
</div>
</div>

<div class="card" style="margin-bottom: 24px;">
<div class="card-hd">
<div class="card-title">Rollback Center</div>
</div>
<div class="card-bd">
<p style="font-size: 14px; color: var(--text-mid); margin-bottom: 12px;">Restore a project to its state before the last Model DSR import.</p>
<div style="display:flex; gap:12px; align-items:flex-end;">
<div class="field" style="margin:0;">
<label>Project ID to Rollback</label>
<input type="number" id="mdsr-rollback-id" placeholder="Enter Project ID" class="input" style="width: 200px;">
</div>
<button class="btn btn-saffron" id="btn-mdsr-rollback">Undo Last Import</button>
</div>
</div>
</div>

<div class="card">
<div class="card-hd">
<div class="card-title">Model DSR Version History</div>`;

c = c.replace(/<div style="display:flex; gap:12px; margin-top:8px;">[\s\S]*?<div class="card-title">Model DSR Version History<\/div>/i, replacement);
fs.writeFileSync('./apps/web/public/legacy/login.html', c);
console.log("Replaced successfully!");
