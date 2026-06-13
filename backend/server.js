const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST']
  }
});

// Simple in-memory storage for rooms
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) {
      // First person to join becomes the host
      rooms[roomId] = { hostId: socket.id };
      console.log(`User ${socket.id} is the host of room ${roomId}`);
    } else {
      // Not the first person, ask the host for the current state
      io.to(rooms[roomId].hostId).emit('request_sync', { requestingUserId: socket.id });
    }

    // Broadcast to others in the room
    socket.to(roomId).emit('user_joined', { userId: socket.id });
  });

  socket.on('sync_state', ({ roomId, time, playing, requestingUserId }) => {
    // The host sends the current state, and we forward it to the specific user who requested it
    io.to(requestingUserId).emit('sync_state', { time, playing });
  });

  socket.on('play', ({ roomId, time }) => {
    socket.to(roomId).emit('play', { time });
  });

  socket.on('pause', ({ roomId, time }) => {
    socket.to(roomId).emit('pause', { time });
  });

  socket.on('seek', ({ roomId, time }) => {
    socket.to(roomId).emit('seek', { time });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Simple cleanup: if the host disconnects, reassign host (simplified for now)
    for (const roomId in rooms) {
      if (rooms[roomId].hostId === socket.id) {
        // Need to reassign host to someone else in the room
        const clients = io.sockets.adapter.rooms.get(roomId);
        if (clients && clients.size > 0) {
          const nextHost = Array.from(clients)[0];
          rooms[roomId].hostId = nextHost;
          console.log(`User ${nextHost} is now the host of room ${roomId}`);
        } else {
          delete rooms[roomId]; // Room empty
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
