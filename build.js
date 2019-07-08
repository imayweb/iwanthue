const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');

const INCLUDES_RE = /<\?php\s+include\(['"]([^'"]+\.php)['"]\);?\s*\?>/gi;
const ASSET_URL_RE = /(["'])((?:css|img|js|res)\/[^"']+)["']/g;

const GOOGLE_ANALYTICS = process.env.GOOGLE_ANALYTICS,
      TWEET = process.env.TWEET,
      PREFIX = process.env.PREFIX;

if (!GOOGLE_ANALYTICS || !TWEET || !PREFIX) {
  console.error('Missing env var!');
  process.exit(1);
}

const ASSETS = [
  'css',
  'img',
  'js',
  'res'
];

const phpFiles = glob.sync('*.php');
fs.ensureDirSync('./build');

function solveIncludes(code) {
  let solved =  code.replace(INCLUDES_RE, function(m, p) {
    return fs.readFileSync(p, 'utf-8');
  })

  return solved
    .replace(/\$GOOGLE_ANALYTICS/g, GOOGLE_ANALYTICS)
    .replace(/\$TWEET/g, TWEET)
    .replace(ASSET_URL_RE, `$1${PREFIX}$2$1`);
}

// Resolving PHP files
phpFiles.forEach(file => {
  console.log(`Processing ${file}...`);

  let code = fs.readFileSync(file, 'utf-8')

  code = solveIncludes(code);

  code = `---\nredirect_from: /${file}.html\n---\n` + code;

  if (file.endsWith('index.php')) {
    fs.writeFileSync(path.join('./build', 'index.html'), code, 'utf-8');
  }
  else {
    const dir = path.join('./build', path.basename(file, '.php'));

    fs.ensureDirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), code, 'utf-8');
  }
});

// Copying assets
console.log('Copying assets...');
ASSETS.forEach(dir => {
  fs.copySync(dir, path.join('./build', dir));
});

const GLOB_ASSETS = [
  '*.png',
  'favicon.ico',
  'humans.txt',
  'robots.txt',
  'meta.json'
];

GLOB_ASSETS.forEach(g => {
  glob.sync(g).forEach(p => {
    fs.copyFileSync(p, path.join('./build', p));
  });
});

fs.writeFileSync(path.join('./build', '_config.yml'), 'plugins:\n  - jekyll-redirect-from\n', 'utf-8');

console.log('Success!');