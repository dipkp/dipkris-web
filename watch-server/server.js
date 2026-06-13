const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow all for dev
    methods: ["GET", "POST"]
  }
});

// In-memory room state
// rooms[roomId] = { host: socketId, users: Set(socketId) }
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, userId }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        host: socket.id,
        users: new Set()
      };
    }
    
    rooms[roomId].users.add(socket.id);
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

    const isHost = rooms[roomId].host === socket.id;
    socket.emit('room_joined', { isHost, roomId, userId });

    socket.to(roomId).emit('user_joined', { userId, socketId: socket.id });

    if (!isHost) {
      // Ask host for current state
      io.to(rooms[roomId].host).emit('request_sync', { targetSocketId: socket.id });
    }
  });

  socket.on('send_sync', ({ targetSocketId, state }) => {
    // Host sends current media state to the newly joined user
    io.to(targetSocketId).emit('sync_state', state);
  });

  // Media controls
  socket.on('play_video', ({ roomId, time }) => {
    socket.to(roomId).emit('play_video', { time });
  });

  socket.on('pause_video', ({ roomId, time }) => {
    socket.to(roomId).emit('pause_video', { time });
  });

  socket.on('seek_video', ({ roomId, time }) => {
    socket.to(roomId).emit('seek_video', { time });
  });

  socket.on('change_video', ({ roomId, url }) => {
    // Optionally we can store this in the room state if we expand the state object
    socket.to(roomId).emit('change_video', { url });
  });

  // WebRTC Signaling (Basic forwarding)
  socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc_offer', { senderSocketId: socket.id, offer });
  });

  socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc_answer', { senderSocketId: socket.id, answer });
  });

  socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc_ice_candidate', { senderSocketId: socket.id, candidate });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id && rooms[roomId]) {
        rooms[roomId].users.delete(socket.id);
        socket.to(roomId).emit('user_left', { socketId: socket.id });

        if (rooms[roomId].host === socket.id) {
          // Assign new host if possible
          if (rooms[roomId].users.size > 0) {
            const nextHost = Array.from(rooms[roomId].users)[0];
            rooms[roomId].host = nextHost;
            io.to(nextHost).emit('is_host', true);
            console.log(`Host changed for room ${roomId} to ${nextHost}`);
          } else {
            delete rooms[roomId];
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
