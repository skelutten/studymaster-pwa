"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const decks_1 = __importDefault(require("./routes/decks"));
const cards_1 = __importDefault(require("./routes/cards"));
const study_1 = __importDefault(require("./routes/study"));
const gamification_1 = __importDefault(require("./routes/gamification"));
const social_1 = __importDefault(require("./routes/social"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
app.use((0, helmet_1.default)({
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
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter_1.rateLimiter);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
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
    });
});
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
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/decks', decks_1.default);
app.use('/api/cards', cards_1.default);
app.use('/api/study', study_1.default);
app.use('/api/gamification', gamification_1.default);
app.use('/api/social', social_1.default);
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
    });
    socket.on('start-study-session', (data) => {
        socket.broadcast.emit('friend-studying', data);
    });
    socket.on('deck-edit', (data) => {
        socket.to(`deck-${data.deckId}`).emit('deck-updated', data);
    });
    socket.on('challenge-progress', (data) => {
        io.emit('leaderboard-update', data);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map