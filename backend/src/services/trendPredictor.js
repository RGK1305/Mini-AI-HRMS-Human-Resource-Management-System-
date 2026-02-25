const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Performance Trend Predictor
 * - Groups completed tasks by calendar month
 * - Computes a monthly performance score (completion rate × avg complexity)
 * - Fits a simple linear regression over those monthly scores
 * - Returns trend direction, monthly data, and a predicted next-month score
 *
 * Cold-start guard: if fewer than 2 distinct months OR fewer than 5 completed
 * tasks exist, we don't have enough signal — return confidence: 'insufficient_data'
 */

function linearRegression(points) {
    // points = [{ x: monthIndex, y: score }, ...]
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

async function predictTrend(employeeId) {
    const tasks = await prisma.task.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'asc' },
    });

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

    // ── Cold-start guard ───────────────────────────────────────────────────────
    if (completedTasks.length < 5) {
        return {
            trend: 'stable',
            confidence: 'insufficient_data',
            monthlyData: [],
            predictedNextMonth: null,
            message: 'Collecting more data to predict trends.',
        };
    }

    // ── Group tasks by YYYY-MM ─────────────────────────────────────────────────
    const byMonth = {};
    for (const task of tasks) {
        const d = new Date(task.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[key]) byMonth[key] = { all: [], completed: [] };
        byMonth[key].all.push(task);
        if (task.status === 'COMPLETED') byMonth[key].completed.push(task);
    }

    const monthKeys = Object.keys(byMonth).sort();

    // Second cold-start guard: need at least 2 months with data
    if (monthKeys.length < 2) {
        return {
            trend: 'stable',
            confidence: 'insufficient_data',
            monthlyData: [],
            predictedNextMonth: null,
            message: 'Collecting more data to predict trends.',
        };
    }

    // ── Compute monthly score ──────────────────────────────────────────────────
    // Score = completionRate(0-100) × 0.6  +  avgComplexity(0-100) × 0.4
    const monthlyData = monthKeys.map((key, idx) => {
        const { all, completed } = byMonth[key];
        const completionRate = all.length > 0 ? (completed.length / all.length) * 100 : 0;
        const avgComplexity = all.length > 0
            ? (all.reduce((s, t) => s + t.complexity, 0) / all.length / 5) * 100
            : 0;
        const score = Math.round(completionRate * 0.6 + avgComplexity * 0.4);
        return { month: key, score, taskCount: all.length, completedCount: completed.length, idx };
    });

    // ── Linear regression (Excluding Current Month) ────────────────────────────
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    
    // Only use historical (completed) months for the math
    const historicalData = monthlyData.filter(m => m.month !== currentMonthStr);

    let slope = 0;
    let intercept = 0;
    let trend = 'stable';
    let confidence = 'insufficient_data';
    let predictedNextMonth = null;

    // Need at least 2 completed historical months to draw a trend line
    if (historicalData.length >= 2) {
        const points = historicalData.map(m => ({ x: m.idx, y: m.score }));
        const reg = linearRegression(points);
        slope = reg.slope;
        intercept = reg.intercept;

        // Predict the month AFTER the latest data point
        const nextIdx = monthlyData[monthlyData.length - 1].idx + 1;
        predictedNextMonth = Math.round(Math.min(100, Math.max(0, slope * nextIdx + intercept)));

        // ── Trend classification ──
        if (slope > 1.5) trend = 'improving';
        else if (slope < -1.5) trend = 'declining';
        else trend = 'stable';

        // Confidence based on number of historical months
        confidence = historicalData.length >= 4 ? 'high' : 'medium';
    }

    return { 
        trend, 
        confidence, 
        slope: Math.round(slope * 100) / 100, 
        monthlyData, // We still return the full array (including current month) for the UI
        predictedNextMonth 
    };
}

module.exports = { predictTrend };