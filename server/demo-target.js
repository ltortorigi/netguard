import net from 'node:net';

// Disposable localhost TCP listener for demonstrating reachable / unreachable.
// Ctrl+C stops the listener without affecting any real cloud service.
const host = '127.0.0.1';
const port = 43080;
const server = net.createServer((socket) => {
  // A monitoring client can close/reset its probe immediately after connecting.
  // Handle that normal behavior so the disposable target stays alive.
  socket.on('error', (error) => {
    if (error.code !== 'ECONNRESET') console.error('Demo socket error:', error.message);
  });
  socket.end('NetGuard test target\n');
});
server.listen(port, host, () => {
  console.log(`Demo target running on ${host}:${port}. Press Ctrl+C to simulate an outage.`);
});
