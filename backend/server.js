require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Dynamic CORS based on Environment Variable (for Vercel & Render)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST']
}));

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST']
  }
});

// In-memory state
// Map<roomId, { videoUrl, isPlaying, timestamp, hostId, users: Set<socketId> }>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // JOIN ROOM
  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        videoUrl: '',
        isPlaying: false,
        timestamp: 0,
        hostId: socket.id,
        users: new Set([socket.id])
      });
    } else {
      rooms.get(roomId).users.add(socket.id);
    }

    const room = rooms.get(roomId);
    
    // Send current state to the joining user, including list of users already in the room
    socket.emit('room-state', {
      videoUrl: room.videoUrl,
      isPlaying: room.isPlaying,
      timestamp: room.timestamp,
      hostId: room.hostId,
      users: Array.from(room.users)
    });

    // Notify others that a new user joined (for WebRTC Mesh)
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // SYNCHRONIZATION ENGINE
  socket.on('sync-state', ({ roomId, videoUrl, isPlaying, timestamp }) => {
    const room = rooms.get(roomId);
    if (room) {
      // Security: Only allow the Host to sync state
      if (room.hostId === socket.id) {
        room.videoUrl = videoUrl !== undefined ? videoUrl : room.videoUrl;
        room.isPlaying = isPlaying !== undefined ? isPlaying : room.isPlaying;
        room.timestamp = timestamp !== undefined ? timestamp : room.timestamp;

        // Broadcast SYNC_STATE to ALL clients in the room, including the host
        io.to(roomId).emit('SYNC_STATE', {
          videoUrl: room.videoUrl,
          isPlaying: room.isPlaying,
          timestamp: room.timestamp,
          hostId: room.hostId
        });
      }
    }
  });

  // WEBRTC SIGNALING (Mesh Network)
  socket.on('webrtc-offer', ({ targetId, callerId, sdp }) => {
    io.to(targetId).emit('webrtc-offer', { callerId, sdp });
  });

  socket.on('webrtc-answer', ({ targetId, callerId, sdp }) => {
    io.to(targetId).emit('webrtc-answer', { callerId, sdp });
  });

  socket.on('webrtc-ice-candidate', ({ targetId, callerId, candidate }) => {
    io.to(targetId).emit('webrtc-ice-candidate', { callerId, candidate });
  });

  // DANMAKU CHAT
  socket.on('chat-message', ({ roomId, text }) => {
    // Broadcast to room
    io.to(roomId).emit('chat-message', {
      senderId: socket.id,
      text
    });
  });

  // DISCONNECT & CLEANUP
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        const room = rooms.get(roomId);
        if (room) {
          room.users.delete(socket.id);
          
          if (room.users.size === 0) {
            rooms.delete(roomId); // Clean up memory if empty
          } else {
            // If the host leaves, assign a new host
            if (room.hostId === socket.id) {
              const remainingUsers = Array.from(room.users);
              room.hostId = remainingUsers[0]; // Elect next available user
              io.to(roomId).emit('new-host', room.hostId);
            }
            socket.to(roomId).emit('user-left', socket.id);
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling Server running on port ${PORT}`);
});
