const net = require('net')
const server = net.createServer()
server.on('connection', handleConnection)

server.listen(3000)


function handleConnection(socket) {
    socket.on('data', chunk => {
        console.log('Received chunk:\n', chunk.toString())
    });
    socket.write('HTTP/1.1 200 OK\r\n Sever: my-web-server\r\nContent-Length: 0\r\n\r\n');
}