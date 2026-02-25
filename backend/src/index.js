require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Warn loudly if running with the insecure dev default
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'rize-dev-secret-key') {
    console.warn('⚠️  WARNING: JWT_SECRET is not set or is using the dev default. Set a strong secret in production!');
}

// Middleware
// CORS_ORIGIN supports comma-separated origins for multi-domain deployments
// e.g. CORS_ORIGIN=https://rizeos.com,https://www.rizeos.com
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RIZE OS Backend running on port ${PORT}`);
});
