const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // Normalize url
  let filePath = '.' + req.url.split('?')[0]; // strip query strings
  if (filePath === './') {
    filePath = './index.html';
  }

  // Resolve absolute path safely within project folder
  const resolvedPath = path.resolve(__dirname, filePath);
  const rootPath = path.resolve(__dirname);
  
  if (!resolvedPath.startsWith(rootPath)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const extname = String(path.extname(resolvedPath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File Not Found');
      } else {
        res.statusCode = 500;
        res.end('Internal Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
