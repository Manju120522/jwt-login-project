const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Secret key for JWT (use environment variables in production)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-2024';

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mock user database (replace with real database in production)
const users = [
    { 
        id: 1, 
        username: 'admin', 
        password: 'admin123',
        role: 'Administrator'
    },
    { 
        id: 2, 
        username: 'user', 
        password: 'user123',
        role: 'User'
    },
    { 
        id: 3, 
        username: 'Manjula', 
        password: 'password123',
        role: 'User'
    }
];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ 
            message: 'Access denied. No authentication token provided.',
            authenticated: false
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                message: 'Token expired. Please login again.',
                authenticated: false
            });
        }
        return res.status(403).json({ 
            message: 'Invalid authentication token.',
            authenticated: false
        });
    }
};

// ==================== ROUTES ====================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ 
            message: 'Username and password are required' 
        });
    }

    // Find user (in production, hash passwords with bcrypt)
    const user = users.find(u => 
        u.username === username && u.password === password
    );

    if (!user) {
        return res.status(401).json({ 
            message: 'Invalid username or password' 
        });
    }

    // Generate JWT token
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Set HTTP-only cookie with token
    res.cookie('token', token, {
        httpOnly: true, // Prevents JavaScript access
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 3600000 // 1 hour in milliseconds
    });

    // Send success response
    res.json({ 
        message: 'Login successful!',
        user: { 
            id: user.id, 
            username: user.username,
            role: user.role
        },
        authenticated: true
    });

    console.log(`✅ User logged in: ${username} at ${new Date().toLocaleTimeString()}`);
});

// Dashboard endpoint (protected route)
app.get('/dashboard', authenticateToken, (req, res) => {
    res.json({ 
        message: `Welcome to your dashboard, ${req.user.username}!`,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        },
        authenticated: true,
        timestamp: new Date().toISOString()
    });
});

// Get user profile (protected route)
app.get('/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json({
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        },
        authenticated: true
    });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    const username = req.cookies.token ? 
        jwt.decode(req.cookies.token)?.username : 'Unknown';
    
    // Clear the authentication cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });

    res.json({ 
        message: 'Logged out successfully',
        authenticated: false
    });

    console.log(`👋 User logged out: ${username} at ${new Date().toLocaleTimeString()}`);
});

// Verify token endpoint (check if user is authenticated)
app.get('/verify', authenticateToken, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        message: 'Endpoint not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 JWT Authentication Server Started');
    console.log('='.repeat(50));
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
    console.log('\n📋 Test Credentials:');
    console.log('   Username: admin   | Password: admin123');
    console.log('   Username: user    | Password: user123');
    console.log('   Username: Manjula | Password: password123');
    console.log('\n⚡ Available Endpoints:');
    console.log('   POST   /login      - Login with credentials');
    console.log('   POST   /logout     - Logout current user');
    console.log('   GET    /dashboard  - Protected dashboard (requires auth)');
    console.log('   GET    /profile    - Get user profile (requires auth)');
    console.log('   GET    /verify     - Verify authentication');
    console.log('   GET    /health     - Server health check');
    console.log('='.repeat(50) + '\n');
});