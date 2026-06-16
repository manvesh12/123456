const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/js/model-dsr.js', 'utf8');

// Replace fetchTargetProjects
c = c.replace(/const res = await fetch\(`\/api\/projects`, \{\s*headers: \{ 'Authorization': 'Bearer ' \+ localStorage.getItem\('token'\) \}\s*\}\);/, "const res = await apiFetch('/projects');");
c = c.replace(/const data = await res\.json\(\);/, "const data = await res.json();"); // Actually apiFetch doesn't call json() automatically if we look at api.js, let's check api.js

fs.writeFileSync('./apps/web/public/legacy/js/fix-fetch.js', "c = c.replace(..., '...';");
