const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { calculateScore } = require('../services/scoringEngine');
const { generateInsights } = require('../services/insightGenerator');

const router = express.Router();
const prisma = new PrismaClient();

// GET productivity score for an employee
router.get('/score/:employeeId', authenticateToken, async (req, res, next) => {
    try {
        const { employeeId } = req.params;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, name: true, role: true, organizationId: true },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Org scope check
        if (employee.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const scoreData = await calculateScore(employeeId);

        // Update employee's aiScore in DB
        await prisma.employee.update({
            where: { id: employeeId },
            data: { aiScore: scoreData.score },
        });

        res.json({ employeeId, ...scoreData });
    } catch (err) {
        next(err);
    }
});

// GET AI insights for an employee
router.get('/insights/:employeeId', authenticateToken, async (req, res, next) => {
    try {
        const { employeeId } = req.params;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employee.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const scoreData = await calculateScore(employeeId);
        const insights = await generateInsights(employee, scoreData);

        // Update employee's aiScore
        await prisma.employee.update({
            where: { id: employeeId },
            data: { aiScore: scoreData.score },
        });

        res.json({
            employeeId,
            score: scoreData,
            insights,
        });
    } catch (err) {
        next(err);
    }
});

// GET org-wide analytics (admin only)
router.get('/dashboard', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const orgId = req.user.orgId;

        const [employees, tasks, completedTasks, inProgressTasks, activeGroups] = await Promise.all([
            prisma.employee.findMany({
                where: { organizationId: orgId },
                select: { id: true, name: true, aiScore: true, department: true, role: true },
            }),
            prisma.task.count({ where: { organizationId: orgId } }),
            prisma.task.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
            prisma.task.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
            // Count distinct employees who have at least one active task
            prisma.task.groupBy({
                by: ['employeeId'],
                where: {
                    organizationId: orgId,
                    status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
                },
            }),
        ]);

        // Filter out null employeeId (unassigned tasks) and count unique employees
        const activeEmployees = activeGroups.filter(g => g.employeeId !== null).length;

        const avgScore = employees.length > 0
            ? Math.round(employees.reduce((sum, e) => sum + e.aiScore, 0) / employees.length)
            : 0;

        // Department breakdown
        const departments = {};
        employees.forEach(emp => {
            if (!departments[emp.department]) {
                departments[emp.department] = { count: 0, totalScore: 0 };
            }
            departments[emp.department].count++;
            departments[emp.department].totalScore += emp.aiScore;
        });

        const departmentStats = Object.entries(departments).map(([name, data]) => ({
            department: name,
            employeeCount: data.count,
            avgScore: Math.round(data.totalScore / data.count),
        }));

        res.json({
            totalEmployees: employees.length,
            activeEmployees,
            totalTasks: tasks,
            completedTasks,
            inProgressTasks,
            assignedTasks: tasks - completedTasks - inProgressTasks,
            avgProductivityScore: avgScore,
            departmentStats,
            topPerformers: employees
                .sort((a, b) => b.aiScore - a.aiScore)
                .slice(0, 5),
        });
    } catch (err) {
        next(err);
    }
});

// GET rank employees for a task not yet created (used in Create Task form)
// Query: ?complexity=1-5
router.get('/rank-employees', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

        const orgId = req.user.orgId;
        const complexity = parseInt(req.query.complexity) || 3;

        const employees = await prisma.employee.findMany({
            where: { organizationId: orgId },
            include: {
                tasks: {
                    where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
                    select: { id: true },
                },
            },
        });

        const ranked = employees.map(emp => {
            const performanceScore = emp.aiScore * 0.5;
            const activeTasks = emp.tasks.length;
            const availScore = Math.max(0, 40 - activeTasks * 8);
            const complexityFit = complexity >= 4
                ? (emp.aiScore >= 70 ? 10 : 0)
                : (emp.aiScore <= 60 ? 10 : 5);
            const matchScore = Math.round(Math.min(100, performanceScore + availScore + complexityFit));

            const reasons = [];
            if (emp.aiScore >= 70) reasons.push(`Strong performer (${emp.aiScore}%)`);
            if (activeTasks === 0) reasons.push('No active tasks');
            else if (activeTasks === 1) reasons.push('Light workload');
            else reasons.push(`${activeTasks} active tasks`);
            if (complexity >= 4 && emp.aiScore >= 70) reasons.push('Suited for complex work');

            return { employeeId: emp.id, name: emp.name, role: emp.role, department: emp.department, aiScore: emp.aiScore, activeTasks, matchScore, reason: reasons.join(' · ') };
        }).sort((a, b) => b.matchScore - a.matchScore);

        res.json({ recommendations: ranked });
    } catch (err) {
        next(err);
    }
});

// GET smart task assignment recommendation (admin only, org-scoped)
router.get('/assign-recommendation/:taskId', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const orgId = req.user.orgId; // always pulled from JWT — never from query params

        // Fetch the task, verify it belongs to this org
        const task = await prisma.task.findUnique({
            where: { id: req.params.taskId },
            include: { employee: true },
        });

        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.organizationId !== orgId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Fetch ONLY employees from the same org (tenant isolation)
        const employees = await prisma.employee.findMany({
            where: { organizationId: orgId },
            include: {
                _count: { select: { tasks: true } },
                tasks: {
                    where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
                    select: { id: true },
                },
            },
        });

        // Score each employee
        const ranked = employees.map(emp => {
            // 1. AI productivity score (0-100) ×0.5
            const performanceScore = emp.aiScore * 0.5;

            // 2. Availability — fewer active tasks = better (max bonus 40 pts)
            const activeTasks = emp.tasks.length; // only ASSIGNED+IN_PROGRESS
            const availScore = Math.max(0, 40 - activeTasks * 8);

            // 3. Complexity fit — employees with higher scores get harder tasks
            const complexityFit = task.complexity >= 4
                ? (emp.aiScore >= 70 ? 10 : 0)   // hard task → favour high performers
                : (emp.aiScore <= 60 ? 10 : 5);   // easy task → spread the load

            const matchScore = Math.round(Math.min(100, performanceScore + availScore + complexityFit));

            const reasons = [];
            if (emp.aiScore >= 70) reasons.push(`High productivity score (${emp.aiScore}%)`);
            if (activeTasks === 0) reasons.push('Currently has no active tasks');
            else if (activeTasks <= 1) reasons.push(`Light workload (${activeTasks} active task)`);
            else reasons.push(`${activeTasks} active tasks — moderate workload`);
            if (task.complexity >= 4 && emp.aiScore >= 70) reasons.push('Proven on complex tasks');

            return {
                employeeId: emp.id,
                name: emp.name,
                role: emp.role,
                department: emp.department,
                aiScore: emp.aiScore,
                activeTasks,
                matchScore,
                reason: reasons.join(' · '),
                isCurrentlyAssigned: task.employeeId === emp.id,
            };
        });

        // Sort by matchScore descending
        ranked.sort((a, b) => b.matchScore - a.matchScore);

        res.json({ taskId: task.id, taskTitle: task.title, recommendations: ranked.slice(0, 5) });
    } catch (err) {
        next(err);
    }
});

// GET performance trend prediction for an employee
router.get('/trend/:employeeId', authenticateToken, async (req, res, next) => {
    try {
        const { predictTrend } = require('../services/trendPredictor');
        const { employeeId } = req.params;

        // Verify employee exists and belongs to this org
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, organizationId: true },
        });

        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        if (employee.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const trend = await predictTrend(employeeId);
        res.json(trend);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
