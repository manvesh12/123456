const fs = require('fs');

function removeSwitchers() {
  const files = [
    './apps/web/public/legacy/login.html',
    './apps/web/public/legacy/home.html',
    './apps/web/public/legacy/templates/auth.html'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');

      // Remove top-switcher-bar block
      content = content.replace(/<!-- Fixed Top Switcher Bar -->[\s\S]*?(?=<!-- Theme Toggle Switch)/g, '');
      content = content.replace(/<!-- Fixed Top Switcher Bar -->[\s\S]*?(?=<!-- Top Branding)/g, '');

      // Remove dash-switcher-bar block
      content = content.replace(/<div class="dash-switcher-bar">[\s\S]*?<\/div>[\s]*?(?=<div class="dash-gov-utility-strip">)/g, '');

      fs.writeFileSync(file, content);
      console.log(`Processed ${file}`);
    }
  });
}

removeSwitchers();
