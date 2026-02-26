/**
 * AI Insight Generator
 * Uses LLM API when available, falls back to deterministic mock insights.
 */

const SKILL_SUGGESTIONS = {
    'Frontend Developer': ['Next.js', 'GraphQL', 'Testing (Jest/Cypress)', 'Accessibility (WCAG)', 'Performance Optimization', 'Web3/dApps'],
    'Senior Frontend Developer': ['System Design', 'Micro-Frontend Architecture', 'WebAssembly', 'CI/CD Pipeline Design', 'Mentoring'],
    'Backend Engineer': ['Microservices', 'gRPC', 'Message Queues (Kafka/RabbitMQ)', 'GraphQL', 'System Design', 'Observability'],
    'Product Manager': ['Data Analytics', 'A/B Testing', 'Technical Writing', 'Stakeholder Management', 'Pricing Strategy', 'Growth Hacking'],
    'DevOps Engineer': ['Service Mesh (Istio)', 'Chaos Engineering', 'Security (SAST/DAST)', 'Cost Optimization', 'Platform Engineering'],
    'Data Analyst': ['Machine Learning', 'dbt', 'Apache Spark', 'Data Engineering', 'Storytelling with Data', 'A/B Testing'],
    'Designer': ['Design Systems', 'Motion Design', 'User Research', 'Accessibility', 'Prototyping', 'Design Tokens'],
};

function getPerformanceTier(score) {
    if (score >= 80) return 'exceptional';
    if (score >= 60) return 'strong';
    if (score >= 40) return 'developing';
    return 'needs-attention';
}

function generateMockInsights(employee, scoreData) {
    const tier = getPerformanceTier(scoreData.score);
    const currentSkills = Array.isArray(employee.skills) ? employee.skills : [];

    // Find matching role or closest match
    let roleKey = Object.keys(SKILL_SUGGESTIONS).find(key =>
        employee.role.toLowerCase().includes(key.toLowerCase())
    );
    if (!roleKey) roleKey = Object.keys(SKILL_SUGGESTIONS)[0];

    const allSuggested = SKILL_SUGGESTIONS[roleKey] || SKILL_SUGGESTIONS['Backend Engineer'];
    const suggestedSkills = allSuggested.filter(
        skill => !currentSkills.some(s => s.toLowerCase() === skill.toLowerCase())
    ).slice(0, 4);

    const summaries = {
        exceptional: `${employee.name} is performing exceptionally well as a ${employee.role}. With a ${scoreData.score}% productivity score and ${scoreData.completedTasks}/${scoreData.totalTasks} tasks completed, they consistently deliver before deadlines. They are ready for senior responsibilities and cross-functional leadership opportunities.`,
        strong: `${employee.name} demonstrates strong performance in ${employee.department}. Their ${scoreData.score}% score reflects reliable task completion (${scoreData.completedTasks}/${scoreData.totalTasks}) and solid time management. Investing in the suggested skills below would accelerate their trajectory toward a senior role.`,
        developing: `${employee.name} shows promise in their ${employee.role} position with a ${scoreData.score}% score. Their completion rate of ${scoreData.breakdown.completionRate}% suggests room for improvement in task execution. Consider pairing them with a senior mentor and prioritizing the skill gaps identified below.`,
        'needs-attention': `${employee.name} requires immediate support. With a ${scoreData.score}% productivity score and ${scoreData.breakdown.completionRate}% completion rate, there may be systemic blockers affecting their output. Recommended: a 1-on-1 check-in to identify obstacles, adjusted workload, and a structured learning plan.`,
    };

    return {
        suggestedSkills,
        performanceSummary: summaries[tier],
        performanceTier: tier,
        source: 'mock',
    };
}

async function generateInsights(employee, scoreData) {
    const apiKey = process.env.AI_API_KEY;
    const provider = process.env.AI_PROVIDER || 'openai';

    // If no API key, return mock insights
    if (!apiKey) {
        return generateMockInsights(employee, scoreData);
    }

    try {
        if (provider === 'openai') {
            const OpenAI = require('openai');
            const openai = new OpenAI({
                apiKey,
                baseURL: process.env.AI_BASE_URL || undefined,
            });

            const response = await openai.chat.completions.create({
                model: process.env.AI_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an HR analytics AI. Given an employee profile and productivity data, return a JSON object with exactly two fields: "suggestedSkills" (array of 3-5 skill strings the employee should learn based on their role and current gaps) and "performanceSummary" (2-3 sentence performance review). Return ONLY valid JSON, no markdown.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            name: employee.name,
                            role: employee.role,
                            department: employee.department,
                            currentSkills: employee.skills,
                            productivityScore: scoreData.score,
                            breakdown: scoreData.breakdown,
                            completedTasks: scoreData.completedTasks,
                            totalTasks: scoreData.totalTasks,
                        }),
                    },
                ],
                temperature: 0.1, // Fixed: Lower temperature so suggestions are more consistent
                max_tokens: 500,
            });

            const parsed = JSON.parse(response.choices[0].message.content);

            // Re-inject the calculated performance tier so it still renders the badge
            const tier = getPerformanceTier(scoreData.score);

            return {
                suggestedSkills: parsed.suggestedSkills,
                performanceSummary: parsed.performanceSummary,
                performanceTier: tier,
                source: 'openai'
            };
        }

        // Fallback to mock if provider not recognized
        return generateMockInsights(employee, scoreData);
    } catch (err) {
        console.error('AI API call failed, using mock fallback:', err.message);
        return generateMockInsights(employee, scoreData);
    }
}

module.exports = { generateInsights, generateMockInsights };
