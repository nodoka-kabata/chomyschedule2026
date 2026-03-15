import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import logger from './logger.js';
import { setIo } from './socket.js';

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

setIo(io);

io.on('connection', (socket) => {
  logger.info(`socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
