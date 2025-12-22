import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import departmentsRoutes from './routes/departments';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import subtasksRoutes from './routes/subtasks';
import timeEntriesRoutes from './routes/timeEntries';
import activitiesRoutes from './routes/activities';
import channelsRoutes from './routes/channels';
import messagesRoutes from './routes/messages';
import commentsRoutes from './routes/comments';
import chatsRoutes from './routes/chats';
import servicesRoutes from './routes/services';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO for WebRTC signaling
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Store voice channel participants
interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
}

const voiceChannels: Map<string, Map<string, VoiceParticipant>> = new Map();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      userId: string;
      email: string;
      username: string;
    };
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.username} (${socket.id})`);

  // Join voice channel
  socket.on('voice:join', (channelId: string) => {
    // Leave any previous voice channel
    voiceChannels.forEach((participants, chId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        socket.leave(`voice:${chId}`);
        io.to(`voice:${chId}`).emit('voice:user-left', {
          socketId: socket.id,
          userId: user.userId,
          username: user.username,
        });
      }
    });

    // Join new channel
    if (!voiceChannels.has(channelId)) {
      voiceChannels.set(channelId, new Map());
    }

    const channelParticipants = voiceChannels.get(channelId)!;
    channelParticipants.set(socket.id, {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
    });

    socket.join(`voice:${channelId}`);

    // Notify others in channel
    socket.to(`voice:${channelId}`).emit('voice:user-joined', {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
    });

    // Send list of existing participants to the new user
    const participants = Array.from(channelParticipants.values()).filter(
      (p) => p.socketId !== socket.id
    );
    socket.emit('voice:participants', participants);

    console.log(`${user.username} joined voice channel ${channelId}`);
  });

  // Leave voice channel
  socket.on('voice:leave', (channelId: string) => {
    const channelParticipants = voiceChannels.get(channelId);
    if (channelParticipants) {
      channelParticipants.delete(socket.id);
      socket.leave(`voice:${channelId}`);
      io.to(`voice:${channelId}`).emit('voice:user-left', {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
      });
      console.log(`${user.username} left voice channel ${channelId}`);
    }
  });

  // WebRTC signaling - Offer
  socket.on('webrtc:offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc:offer', {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
      offer,
    });
  });

  // WebRTC signaling - Answer
  socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc:answer', {
      socketId: socket.id,
      answer,
    });
  });

  // WebRTC signaling - ICE candidate
  socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc:ice-candidate', {
      socketId: socket.id,
      candidate,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove from all voice channels
    voiceChannels.forEach((participants, channelId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        io.to(`voice:${channelId}`).emit('voice:user-left', {
          socketId: socket.id,
          userId: user.userId,
          username: user.username,
        });
      }
    });
    console.log(`User disconnected: ${user.username}`);
  });
});

// Export io for use in routes if needed
export { io };

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/subtasks', subtasksRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/services', servicesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint no encontrado' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Start server (using httpServer for Socket.IO support)
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Workplace Hub API Server                              ║
║   🎙️  Voice Chat enabled via Socket.IO                     ║
║                                                            ║
║   Server running on: http://localhost:${PORT}                ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
