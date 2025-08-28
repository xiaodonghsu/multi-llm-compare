const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // 处理首页请求
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    
    // 获取文件扩展名
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // 服务器错误
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // 成功响应
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const interfaces = require('os').networkInterfaces();
    const addresses = [];
    
    // 获取所有网络接口的IP地址
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // 跳过内部IPv6地址和非IPv4地址
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    console.log(`服务器运行在:`);
    console.log(`- http://localhost:${PORT}/`);
    
    // 显示所有可访问的IP地址
    if (addresses.length > 0) {
        console.log('在局域网中可通过以下地址访问:');
        addresses.forEach(addr => {
            console.log(`- http://${addr}:${PORT}/`);
        });
    }
});
