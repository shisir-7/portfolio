import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, '');
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

function stripJsCommentsRobust(js) {
  let result = '';
  let i = 0;
  const len = js.length;
  const stack = [];
  const braceDepths = [];

  while (i < len) {
    const char = js[i];
    const next = js[i + 1];
    const currentMode = stack[stack.length - 1];

    if (currentMode === 'STRING_SINGLE') {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === "'") {
        stack.pop();
      }
      i++;
      continue;
    }

    if (currentMode === 'STRING_DOUBLE') {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === '"') {
        stack.pop();
      }
      i++;
      continue;
    }

    if (currentMode === 'REGEX') {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === '/') {
        stack.pop();
      }
      i++;
      continue;
    }

    if (currentMode === 'TEMPLATE') {
      result += char;
      if (char === '\\') {
        if (i + 1 < len) {
          result += js[i + 1];
          i++;
        }
      } else if (char === '$' && next === '{') {
        result += '{';
        i++;
        stack.push('TEMPLATE_EXPR');
        braceDepths.push(1);
      } else if (char === '`') {
        stack.pop();
      }
      i++;
      continue;
    }

    if (currentMode === 'TEMPLATE_EXPR') {
      if (char === '{') {
        braceDepths[braceDepths.length - 1]++;
      } else if (char === '}') {
        braceDepths[braceDepths.length - 1]--;
        if (braceDepths[braceDepths.length - 1] === 0) {
          braceDepths.pop();
          stack.pop();
          result += '}';
          i++;
          continue;
        }
      }
    }

    if (char === "'") {
      stack.push('STRING_SINGLE');
      result += char;
      i++;
      continue;
    }

    if (char === '"') {
      stack.push('STRING_DOUBLE');
      result += char;
      i++;
      continue;
    }

    if (char === '`') {
      stack.push('TEMPLATE');
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
        stack.push('REGEX');
      }
    }

    result += char;
    i++;
  }

  return result;
}

function cleanBlankLines(text) {
  return text.replace(/(\r?\n){3,}/g, '\n\n').trim() + '\n';
}

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.kilo', 'dist'].includes(entry.name)) continue;
      processDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.html') {
        const raw = fs.readFileSync(fullPath, 'utf8');
        let cleaned = stripHtmlComments(raw);
        cleaned = cleaned.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, css, close) => {
          return open + stripCssComments(css) + close;
        });
        cleaned = cleaned.replace(/(<script\b(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, js, close) => {
          return open + stripJsCommentsRobust(js) + close;
        });
        cleaned = cleanBlankLines(cleaned);
        fs.writeFileSync(fullPath, cleaned, 'utf8');
      } else if (ext === '.css') {
        const raw = fs.readFileSync(fullPath, 'utf8');
        let cleaned = stripCssComments(raw);
        cleaned = cleanBlankLines(cleaned);
        fs.writeFileSync(fullPath, cleaned, 'utf8');
      } else if ((ext === '.js' || ext === '.mjs') && !entry.name.endsWith('.test.mjs') && !entry.name.endsWith('.test.js')) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        let cleaned = stripJsCommentsRobust(raw);
        cleaned = cleanBlankLines(cleaned);
        fs.writeFileSync(fullPath, cleaned, 'utf8');
      }
    }
  }
}

processDir(rootDir);
console.log('Project files successfully stripped of comments.');
