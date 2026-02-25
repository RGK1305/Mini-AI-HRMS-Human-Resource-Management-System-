const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Productivity Scoring Engine
 * Score = (CompletionRate × 0.5) + (SpeedVsDeadline × 0.3) + (AvgComplexity × 0.2)
 */
async function calculateScore(employeeId) {
    const tasks = await prisma.task.findMany({
        where: { employeeId },
    });

    if (tasks.length === 0) {
        return { score: 0, breakdown: { completionRate: 0, speedScore: 0, complexityScore: 0 }, totalTasks: 0 };
    }

    // 1. Completion Rate (0-100)
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const completionRate = (completedTasks.length / tasks.length) * 100;

    // 2. Speed vs Deadline (0-100)
    // Binary scoring: meeting the deadline = 100. Late = scaled penalty.
    // FIX 1 (Midnight Bug): deadline is pushed to end-of-day so selecting
    //   "March 1" doesn't penalise employees who finish at 2 PM on March 1.
    // FIX 2 (Math Flaw): we no longer grade "how much time was left over".
    //   Completing a 10-day task on day 9 is a 100%, not 10%.
    let speedScore = 50; // default when no completed tasks exist
    if (completedTasks.length > 0) {
        const speedScores = completedTasks.map(task => {
            // Push deadline to 23:59:59.999 of the due date (Fix #1)
            const deadline = new Date(task.deadline);
            deadline.setHours(23, 59, 59, 999);

            const completedAt = new Date(task.completedAt || task.updatedAt);
            const createdAt = new Date(task.createdAt);

            if (completedAt <= deadline) {
                // On time — base score is 100 (Fix #2)
                let score = 100;

                // Optional early-finish bonus: +10 if done in less than half the allotted time
                const totalDuration = deadline.getTime() - createdAt.getTime();
                const timeTaken = completedAt.getTime() - createdAt.getTime();
                if (totalDuration > 0 && timeTaken < totalDuration / 2) {
                    score = 110;
                }
                return score;
            } else {
                // Late — scale penalty by how many days overdue vs. total window
                const totalDuration = deadline.getTime() - createdAt.getTime();
                const overdueDuration = completedAt.getTime() - deadline.getTime();
                if (totalDuration <= 0) return 0;
                const latePenalty = Math.min(1, overdueDuration / totalDuration);
                return Math.max(0, Math.round((1 - latePenalty) * 100));
            }
        });
        speedScore = speedScores.reduce((a, b) => a + b, 0) / speedScores.length;
    }

    // 3. Average Complexity (0-100)
    // Higher complexity tasks = higher score
    const avgComplexity = tasks.reduce((sum, t) => sum + t.complexity, 0) / tasks.length;
    const complexityScore = (avgComplexity / 5) * 100;

    // Final score
    const score = Math.round(
        (completionRate * 0.5) + (speedScore * 0.3) + (complexityScore * 0.2)
    );

    return {
        score: Math.min(100, Math.max(0, score)),
        breakdown: {
            completionRate: Math.round(completionRate * 10) / 10,
            speedScore: Math.round(speedScore * 10) / 10,
            complexityScore: Math.round(complexityScore * 10) / 10,
        },
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
    };
}

module.exports = { calculateScore };
