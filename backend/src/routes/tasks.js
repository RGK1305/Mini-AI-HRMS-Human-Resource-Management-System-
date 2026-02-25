const express = require('express');
const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET all tasks for the org (admin) or for the employee
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const where = req.user.role === 'admin'
            ? { organizationId: req.user.orgId }
            : { employeeId: req.user.id };

        const tasks = await prisma.task.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(tasks);
    } catch (err) {
        next(err);
    }
});

// GET single task
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            include: {
                employee: { select: { id: true, name: true, role: true, department: true } },
            },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        next(err);
    }
});

// CREATE task (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const { title, description, deadline, complexity, employeeId } = req.body;

        if (!title || !deadline || !employeeId) {
            return res.status(400).json({ error: 'Title, deadline, and employeeId are required' });
        }

        // Verify employee belongs to same org
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee || employee.organizationId !== req.user.orgId) {
            return res.status(400).json({ error: 'Invalid employee for this organization' });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description: description || null,
                deadline: new Date(deadline),
                complexity: complexity || 1,
                employeeId,
                organizationId: req.user.orgId,
            },
            include: {
                employee: { select: { id: true, name: true, role: true } },
            },
        });

        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

// UPDATE task status (employee or admin)
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
    try {
        const { status, onChainTxHash } = req.body;

        if (!status || !['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Valid status required: ASSIGNED, IN_PROGRESS, COMPLETED' });
        }

        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Employees can only update their own tasks
        if (req.user.role === 'employee' && task.employeeId !== req.user.id) {
            return res.status(403).json({ error: 'Cannot update tasks assigned to other employees' });
        }

        const updateData = {
            status,
            ...(status === 'COMPLETED' && { completedAt: new Date() }),
            ...(onChainTxHash && { onChainTxHash }),
        };

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                employee: { select: { id: true, name: true, role: true } },
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// UPDATE task details (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const { title, description, deadline, complexity, employeeId } = req.body;

        const updateData = {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(deadline && { deadline: new Date(deadline) }),
            ...(complexity && { complexity }),
            ...(employeeId && { employeeId }),
        };

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                employee: { select: { id: true, name: true, role: true } },
            },
        });

        res.json(task);
    } catch (err) {
        next(err);
    }
});

// DELETE task (admin only — org-scoped)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
    try {
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        if (task.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'Unauthorized to delete this task' });
        }

        await prisma.task.delete({ where: { id: req.params.id } });
        res.json({ message: 'Task deleted' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /tasks/:id/generate-hash ───────────────────────────────────────────
// Computes the salted keccak256 hash of the task payload on the server.
// The ORG_SECRET salt NEVER leaves this process — the browser only receives
// the finished bytes32 values ready to pass directly into MetaMask.
router.post('/:id/generate-hash', authenticateToken, async (req, res, next) => {
    try {
        const { title, completedBy, completedAt, complexity } = req.body;

        if (!title || !completedBy) {
            return res.status(400).json({ error: 'title and completedBy are required' });
        }

        const orgSecret = process.env.ORG_SECRET || 'rize-default-salt';
        const orgName = process.env.ORG_NAME || 'rize-os';

        // 1. bytes32 taskId — keccak256 of the UUID
        const taskIdBytes32 = ethers.keccak256(
            ethers.toUtf8Bytes(req.params.id)
        );

        // 2. activityHash — salted keccak256 of the task payload
        //    Formula: keccak256(orgSecret + "|" + JSON.stringify(payload))
        const payload = JSON.stringify({ title, completedBy, completedAt, complexity });
        const activityHash = ethers.keccak256(
            ethers.toUtf8Bytes(`${orgSecret}|${payload}`)
        );

        // 3. orgId — keccak256 of the organisation name (for indexed event filtering)
        const orgIdBytes32 = ethers.keccak256(
            ethers.toUtf8Bytes(orgName)
        );

        res.json({ taskIdBytes32, activityHash, orgIdBytes32 });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
