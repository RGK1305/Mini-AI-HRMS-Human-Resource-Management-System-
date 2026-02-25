const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../middleware/auth');
const { validatePassword } = require('../utils/validators');

const router = express.Router();
const prisma = new PrismaClient();

// Register Organization (Admin)
router.post('/register-org', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        const existing = await prisma.organization.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Organization with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const org = await prisma.organization.create({
            data: { name, email, password: hashedPassword },
        });

        const token = generateToken({ id: org.id, role: 'admin', orgId: org.id });

        res.status(201).json({
            token,
            user: { id: org.id, name: org.name, email: org.email, role: 'admin' },
        });
    } catch (err) {
        next(err);
    }
});

// Login Organization (Admin)
router.post('/login-org', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const org = await prisma.organization.findUnique({ where: { email } });
        if (!org) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, org.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({ id: org.id, role: 'admin', orgId: org.id });

        res.json({
            token,
            user: { id: org.id, name: org.name, email: org.email, role: 'admin' },
        });
    } catch (err) {
        next(err);
    }
});

// Login Employee
router.post('/login-employee', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const employee = await prisma.employee.findUnique({
            where: { email },
            include: { organization: { select: { name: true } } },
        });
        if (!employee) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, employee.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({
            id: employee.id,
            role: 'employee',
            orgId: employee.organizationId,
        });

        res.json({
            token,
            user: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                role: 'employee',
                department: employee.department,
                jobRole: employee.role,
                organizationName: employee.organization.name,
            },
        });
    } catch (err) {
        next(err);
    }
});

// Get current user info
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role === 'admin') {
            const org = await prisma.organization.findUnique({
                where: { id: req.user.id },
                select: { id: true, name: true, email: true, createdAt: true },
            });
            return res.json({ ...org, role: 'admin' });
        } else {
            const emp = await prisma.employee.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true, name: true, email: true, role: true, department: true,
                    skills: true, walletAddress: true, aiScore: true, organizationId: true,
                    organization: { select: { name: true } },
                },
            });
            return res.json({ ...emp, userRole: 'employee' });
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
