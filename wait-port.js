import net from 'net';

const port = 5000;
const host = '127.0.0.1';

function checkPort() {
  const socket = new net.Socket();
  socket.setTimeout(1000);
  socket.on('connect', () => {
    socket.destroy();
    console.log(`Port ${port} is ready! Starting frontend...`);
    process.exit(0);
  });
  socket.on('error', () => {
    socket.destroy();
    setTimeout(checkPort, 500);
  });
  socket.on('timeout', () => {
    socket.destroy();
    setTimeout(checkPort, 500);
  });
  socket.connect(port, host);
}

console.log(`Waiting for backend on port ${port} to start...`);
checkPort();
