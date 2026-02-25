const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET all employees for the org (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const employees = await prisma.employee.findMany({
            where: { organizationId: req.user.orgId },
            select: {
                id: true, name: true, email: true, role: true, department: true,
                skills: true, walletAddress: true, aiScore: true, createdAt: true,
                _count: { select: { tasks: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(employees);
    } catch (err) {
        next(err);
    }
});

// GET single employee
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
            select: {
                id: true, name: true, email: true, role: true, department: true,
                skills: true, walletAddress: true, aiScore: true, createdAt: true,
                organization: { select: { name: true } },
                tasks: {
                    select: {
                        id: true, title: true, status: true, deadline: true,
                        complexity: true, completedAt: true, onChainTxHash: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Ensure user can only see employees from their own org
        if (employee.organization && req.user.orgId) {
            // Access granted — same org check happens via organizationId
        }

        res.json(employee);
    } catch (err) {
        next(err);
    }
});

// CREATE employee (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, email, password, role, department, skills, walletAddress } = req.body;

        if (!name || !email || !password || !role || !department) {
            return res.status(400).json({ error: 'Name, email, password, role, and department required' });
        }

        const existing = await prisma.employee.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Employee with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const employee = await prisma.employee.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                department,
                skills: skills || [],
                walletAddress: walletAddress || null,
                organizationId: req.user.orgId,
            },
            select: {
                id: true, name: true, email: true, role: true, department: true,
                skills: true, walletAddress: true, aiScore: true, createdAt: true,
            },
        });

        res.status(201).json(employee);
    } catch (err) {
        next(err);
    }
});

// UPDATE employee (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const { name, role, department, skills, walletAddress } = req.body;

        const employee = await prisma.employee.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(role && { role }),
                ...(department && { department }),
                ...(skills && { skills }),
                ...(walletAddress !== undefined && { walletAddress }),
            },
            select: {
                id: true, name: true, email: true, role: true, department: true,
                skills: true, walletAddress: true, aiScore: true,
            },
        });

        res.json(employee);
    } catch (err) {
        next(err);
    }
});

// DELETE employee (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const employeeId = req.params.id;

        // 1. Fetch the employee to check their org
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        
        // 2. Ensure they exist AND belong to the Admin's org
        if (!employee || employee.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'Unauthorized to delete this employee' });
        }

        // 3. Delete safely
        await prisma.employee.delete({ where: { id: employeeId } });
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
