import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import deckRoutes from './routes/decks'
import cardRoutes from './routes/cards'
import studyRoutes from './routes/study'
import gamificationRoutes from './routes/gamification'
import socialRoutes from './routes/social'

// Import middleware
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'

const app = express()
const server = createServer(app)

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}))

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}))

// General middleware
app.use(compression())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(rateLimiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StudyMaster API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      decks: '/api/decks',
      cards: '/api/cards',
      study: '/api/study',
      gamification: '/api/gamification',
      social: '/api/social'
    },
    documentation: '/api/docs'
  })
})

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    title: 'StudyMaster API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${process.env.PORT || 3001}`,
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User login',
        'POST /api/auth/register': 'User registration',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/me': 'Get current user'
      },
      users: {
        'GET /api/users/:id': 'Get user profile',
        'PUT /api/users/:id': 'Update user profile'
      },
      decks: {
        'GET /api/decks': 'Get all decks',
        'POST /api/decks': 'Create new deck',
        'GET /api/decks/:id': 'Get specific deck',
        'PUT /api/decks/:id': 'Update deck',
        'DELETE /api/decks/:id': 'Delete deck'
      },
      cards: {
        'GET /api/cards/:deckId': 'Get cards for deck',
        'POST /api/cards': 'Create new card',
        'PUT /api/cards/:id': 'Update card',
        'DELETE /api/cards/:id': 'Delete card'
      },
      study: {
        'GET /api/study/:deckId/next': 'Get next card for study',
        'POST /api/study/review': 'Submit card review',
        'GET /api/study/stats/:userId': 'Get study statistics'
      },
      gamification: {
        'GET /api/gamification/achievements/:userId': 'Get user achievements',
        'GET /api/gamification/leaderboard': 'Get leaderboard',
        'POST /api/gamification/xp': 'Award XP points'
      },
      social: {
        'GET /api/social/friends/:userId': 'Get user friends',
        'GET /api/social/challenges/:userId': 'Get user challenges',
        'POST /api/social/share': 'Share deck or achievement'
      }
    }
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/decks', deckRoutes)
app.use('/api/cards', cardRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/social', socialRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join user to their personal room
  socket.on('join-user-room', (userId: string) => {
    socket.join(`user-${userId}`)
  })

  // Handle study session events
  socket.on('start-study-session', (data) => {
    // Broadcast to friends or study group
    socket.broadcast.emit('friend-studying', data)
  })

  // Handle real-time collaboration
  socket.on('deck-edit', (data) => {
    socket.to(`deck-${data.deckId}`).emit('deck-updated', data)
  })

  // Handle challenges
  socket.on('challenge-progress', (data) => {
    io.emit('leaderboard-update', data)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

const PORT = process.env.PORT || 3001

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`)
  console.log(`🔗 API URL: http://localhost:${PORT}`)
})

export default app