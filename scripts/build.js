import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function stripHtmlComments(content) {
  return content.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
}

function stripCssComments(css) {
  let result = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const next = css[i + 1];
    if (inString) {
      result += char;
      if (char === '\\') {
        result += (next || '');
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
      } else if (char === '/' && next === '*') {
        const endIdx = css.indexOf('*/', i + 2);
        if (endIdx !== -1) {
          i = endIdx + 1;
        } else {
          break;
        }
      } else {
        result += char;
      }
    }
  }
  return result;
}

function stripJsComments(js) {
  let result = '';
  let i = 0;
  const len = js.length;
  let inString = false;
  let stringChar = '';
  let inRegex = false;

  while (i < len) {
    const char = js[i];
    const next = js[i + 1];

    if (inString) {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    if (inRegex) {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === '/') {
        inRegex = false;
      }
      i++;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    if (char === '/' && next === '/') {
      const lineEnd = js.indexOf('\n', i + 2);
      const comment = lineEnd === -1 ? js.slice(i) : js.slice(i, lineEnd);
      if (comment.includes('# sourceMappingURL=')) {
        result += comment;
      }
      if (lineEnd === -1) {
        break;
      }
      i = lineEnd;
      continue;
    }

    if (char === '/' && next === '*') {
      const blockEnd = js.indexOf('*/', i + 2);
      if (blockEnd === -1) {
        break;
      }
      const comment = js.slice(i, blockEnd + 2);
      if (comment.includes('# sourceMappingURL=')) {
        result += comment;
      } else {
        const newlines = comment.match(/\r?\n/g);
        if (newlines) {
          result += newlines.join('');
        }
      }
      i = blockEnd + 2;
      continue;
    }

    if (char === '/') {
      let prevIdx = result.length - 1;
      while (prevIdx >= 0 && /\s/.test(result[prevIdx])) {
        prevIdx--;
      }
      const prevChar = prevIdx >= 0 ? result[prevIdx] : '';
      if (prevIdx < 0 || /[=({\[,:;!&|?+\-*%<>]/.test(prevChar) || 
          /\b(return|case|typeof|instanceof|void|yield|await|throw|delete)\b$/.test(result.slice(Math.max(0, prevIdx - 15), prevIdx + 1))) {
        inRegex = true;
      }
    }

    result += char;
    i++;
  }

  return result;
}

function processFile(srcPath, destPath) {
  const ext = path.extname(srcPath).toLowerCase();
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (ext === '.html') {
    let content = fs.readFileSync(srcPath, 'utf8');
    content = stripHtmlComments(content);
    
    content = content.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, css, close) => {
      return open + stripCssComments(css) + close;
    });
    content = content.replace(/(<script\b(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, js, close) => {
      return open + stripJsComments(js) + close;
    });
    fs.writeFileSync(destPath, content, 'utf8');
  } else if (ext === '.css') {
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, stripCssComments(content), 'utf8');
  } else if (ext === '.js' || ext === '.mjs') {
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, stripJsComments(content), 'utf8');
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.kilo') {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.test.mjs') || entry.name.endsWith('.test.js')) {
        continue;
      }
      processFile(srcPath, destPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

const rootFiles = ['index.html', 'typing.html', '404.html', 'robots.txt', 'sitemap.xml', 'CNAME'];
for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    processFile(src, path.join(distDir, file));
  }
}

const dirs = ['styles', 'js', 'assets', 'typing', 'gpa-calculator', 'speed-test', 'legal'];
for (const d of dirs) {
  copyDirectory(path.join(rootDir, d), path.join(distDir, d));
}

console.log('Production build successfully generated in ./dist (unnecessary comments stripped).');
