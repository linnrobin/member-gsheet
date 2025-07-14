// scripts/bump-version.js
// Bumps patch version in package.json and app.js
const fs = require('fs');
const path = require('path');

function bumpPatch(version) {
  const parts = version.split('.').map(Number);
  parts[2]++;
  return parts.join('.');
}

// 1. Bump package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const newVersion = bumpPatch(pkg.version);
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Bump app.js
const appPath = path.join(__dirname, '../app.js');
let appJs = fs.readFileSync(appPath, 'utf8');
appJs = appJs.replace(/(APP_VERSION = ')[^']*'/, `$1${newVersion}'`);
fs.writeFileSync(appPath, appJs);

console.log('Version bumped to', newVersion);
