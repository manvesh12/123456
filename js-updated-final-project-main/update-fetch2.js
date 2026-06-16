const fs = require('fs');
let c = fs.readFileSync('./apps/web/public/legacy/js/model-dsr.js', 'utf8');

c = c.replace(/const res = await fetch\('\/api\/projects', \{[\s\S]*?\}\);[\s\S]*?if \(!res\.ok\) throw new Error\('Failed to fetch projects'\);[\s\S]*?const data = await res\.json\(\);/g, "const data = await apiFetch('/projects');");
c = c.replace(/const res = await fetch\(`\/api\/model-dsrs\/\$\{id\}\/import`, \{[\s\S]*?\}\);[\s\S]*?const data = await res\.json\(\);[\s\S]*?if \(!res\.ok\) throw new Error\(data\.error \|\| 'Import failed'\);/g, "const data = await apiFetch(`/model-dsrs/${id}/import`, { method: 'POST', body: JSON.stringify({ targetProjectId, rules }) });");
c = c.replace(/const res = await fetch\(`\/api\/projects\/\$\{projectId\}\/rollback`, \{[\s\S]*?\}\);[\s\S]*?const data = await res\.json\(\);[\s\S]*?if \(!res\.ok\) \{[\s\S]*?throw new Error\(data\.error \|\| 'Failed to rollback'\);[\s\S]*?\}/g, "const data = await apiFetch(`/projects/${projectId}/rollback`, { method: 'POST' });");

fs.writeFileSync('./apps/web/public/legacy/js/model-dsr.js', c);
console.log("apiFetch update complete!");
