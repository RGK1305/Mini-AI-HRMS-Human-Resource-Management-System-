const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper: date N months ago + D days offset
function mthAgo(months, extraDays = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() + extraDays);
  return new Date(d.getTime());
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.task.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.organization.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Technologies',
      email: 'admin@acmetech.com',
      password: hashedPassword,
    },
  });

  // ── Employees ────────────────────────────────────────────────────────────────
  const [alice, bob, carol, david, eva] = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice@acmetech.com',
        password: hashedPassword,
        role: 'Senior Frontend Developer',
        department: 'Engineering',
        skills: ['React', 'TypeScript', 'CSS', 'Figma'],
        organizationId: org.id,
        aiScore: 78,
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Bob Smith',
        email: 'bob@acmetech.com',
        password: hashedPassword,
        role: 'Backend Engineer',
        department: 'Engineering',
        skills: ['Node.js', 'PostgreSQL', 'Docker', 'Redis'],
        organizationId: org.id,
        aiScore: 65,
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Carol Davis',
        email: 'carol@acmetech.com',
        password: hashedPassword,
        role: 'Product Manager',
        department: 'Product',
        skills: ['Roadmapping', 'User Research', 'Agile', 'SQL'],
        organizationId: org.id,
        aiScore: 55,
      },
    }),
    prisma.employee.create({
      data: {
        name: 'David Lee',
        email: 'david@acmetech.com',
        password: hashedPassword,
        role: 'DevOps Engineer',
        department: 'Infrastructure',
        skills: ['AWS', 'Terraform', 'Kubernetes', 'CI/CD'],
        organizationId: org.id,
        aiScore: 72,
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Eva Martinez',
        email: 'eva@acmetech.com',
        password: hashedPassword,
        role: 'Data Analyst',
        department: 'Analytics',
        skills: ['Python', 'SQL', 'Tableau', 'Statistics'],
        organizationId: org.id,
        aiScore: 60,
      },
    }),
  ]);

  // ── Tasks spread across 5 months ─────────────────────────────────────────────
  // Format: { emp, title, description, complexity, createdAt, deadline, status, completedAt }
  // Goal: enough completed tasks per employee across distinct months to trigger
  //       the trend predictor (needs ≥ 5 completed + ≥ 2 months of data).
  //
  // Alice  — improving trend (score rising month by month)
  // Bob    — stable trend
  // Carol  — declining trend (score falling)
  // David  — improving trend
  // Eva    — insufficient data (just 3 tasks, to demo the cold-start message)

  const tasks = [
    // ── Alice: 8 completed across 5 months (improving) ──────────────────────
    { emp: alice, title: 'Design System Audit', desc: 'Audit existing components for consistency', complexity: 3, created: mthAgo(5, 0), deadlineDays: 14, status: 'COMPLETED' },
    { emp: alice, title: 'Storybook Setup', desc: 'Add Storybook for component docs', complexity: 2, created: mthAgo(5, 5), deadlineDays: 7, status: 'COMPLETED' },
    { emp: alice, title: 'Accessibility Audit', desc: 'Fix WCAG AA violations on dashboard', complexity: 3, created: mthAgo(4, 0), deadlineDays: 10, status: 'COMPLETED' },
    { emp: alice, title: 'Dark Mode Implementation', desc: 'Implement full dark mode support', complexity: 4, created: mthAgo(4, 8), deadlineDays: 12, status: 'COMPLETED' },
    { emp: alice, title: 'Performance Profiling', desc: 'Identify and fix React render bottlenecks', complexity: 4, created: mthAgo(3, 2), deadlineDays: 10, status: 'COMPLETED' },
    { emp: alice, title: 'Micro-Frontend Spike', desc: 'POC module federation for team autonomy', complexity: 5, created: mthAgo(2, 0), deadlineDays: 14, status: 'COMPLETED' },
    { emp: alice, title: 'Redesign Landing Page', desc: 'Modernize the company landing page with new branding', complexity: 3, created: mthAgo(1, 0), deadlineDays: 7, status: 'COMPLETED' },
    { emp: alice, title: 'Mobile Responsive Fix', desc: 'Fix broken layouts on tablet and mobile breakpoints', complexity: 2, created: mthAgo(0, -3), deadlineDays: 5, status: 'ASSIGNED' },

    // ── Bob: 8 completed across 5 months (stable) ────────────────────────────
    { emp: bob, title: 'Auth Service Refactor', desc: 'Extract auth into standalone microservice', complexity: 4, created: mthAgo(5, 2), deadlineDays: 14, status: 'COMPLETED' },
    { emp: bob, title: 'Rate Limiting Middleware', desc: 'Add Redis-based rate limiting to API', complexity: 3, created: mthAgo(5, 10), deadlineDays: 7, status: 'COMPLETED' },
    { emp: bob, title: 'Database Schema Migration', desc: 'Add audit log table and backfill', complexity: 4, created: mthAgo(4, 1), deadlineDays: 10, status: 'COMPLETED' },
    { emp: bob, title: 'Implement Search API', desc: 'Build full-text search endpoint for products', complexity: 4, created: mthAgo(3, 0), deadlineDays: 10, status: 'COMPLETED' },
    { emp: bob, title: 'Database Query Optimization', desc: 'Optimize slow queries identified in APM', complexity: 5, created: mthAgo(3, 8), deadlineDays: 7, status: 'COMPLETED' },
    { emp: bob, title: 'Background Job Queue', desc: 'Implement BullMQ job queue for email sending', complexity: 4, created: mthAgo(2, 3), deadlineDays: 12, status: 'COMPLETED' },
    { emp: bob, title: 'gRPC Internal Service', desc: 'Replace REST with gRPC for internal communication', complexity: 5, created: mthAgo(1, 0), deadlineDays: 14, status: 'COMPLETED' },
    { emp: bob, title: 'API Gateway Config', desc: 'Configure Kong API gateway for new services', complexity: 3, created: mthAgo(0, -2), deadlineDays: 10, status: 'IN_PROGRESS' },

    // ── Carol: 8 completed across 5 months (declining) ───────────────────────
    { emp: carol, title: 'Q3 Roadmap Planning', desc: 'Plan Q3 product roadmap with stakeholders', complexity: 3, created: mthAgo(5, 0), deadlineDays: 7, status: 'COMPLETED' },
    { emp: carol, title: 'User Interview Sessions', desc: 'Conduct 8 user interviews for new feature', complexity: 3, created: mthAgo(5, 7), deadlineDays: 10, status: 'COMPLETED' },
    { emp: carol, title: 'Competitive Analysis', desc: 'Analysis of 5 competitor products', complexity: 3, created: mthAgo(4, 0), deadlineDays: 10, status: 'COMPLETED' },
    { emp: carol, title: 'Sprint Retrospective', desc: 'Facilitate sprint retro and write action items', complexity: 2, created: mthAgo(4, 10), deadlineDays: 3, status: 'COMPLETED' },
    { emp: carol, title: 'Feature Spec Writing', desc: 'Write PRD for new onboarding flow', complexity: 3, created: mthAgo(3, 0), deadlineDays: 10, status: 'COMPLETED' },
    { emp: carol, title: 'A/B Test Design', desc: 'Design experiment for checkout flow', complexity: 4, created: mthAgo(2, 0), deadlineDays: 12, status: 'COMPLETED' },
    { emp: carol, title: 'User Journey Mapping', desc: 'Map the onboarding funnel and identify drop-off points', complexity: 2, created: mthAgo(1, 0), deadlineDays: 7, status: 'COMPLETED' },
    { emp: carol, title: 'Feature Prioritization Workshop', desc: 'Facilitate sprint planning with stakeholders', complexity: 2, created: mthAgo(0, -1), deadlineDays: 5, status: 'ASSIGNED' },

    // ── David: 8 completed across 5 months (improving) ───────────────────────
    { emp: david, title: 'AWS Cost Audit', desc: 'Identify and eliminate unused AWS resources', complexity: 3, created: mthAgo(5, 1), deadlineDays: 10, status: 'COMPLETED' },
    { emp: david, title: 'Docker Base Images', desc: 'Standardize Docker base images across services', complexity: 2, created: mthAgo(5, 8), deadlineDays: 7, status: 'COMPLETED' },
    { emp: david, title: 'Log Aggregation Setup', desc: 'Deploy ELK stack for centralized logging', complexity: 4, created: mthAgo(4, 2), deadlineDays: 12, status: 'COMPLETED' },
    { emp: david, title: 'Secrets Management', desc: 'Migrate secrets to AWS Secrets Manager', complexity: 4, created: mthAgo(3, 0), deadlineDays: 10, status: 'COMPLETED' },
    { emp: david, title: 'Zero-Downtime Deployment', desc: 'Implement blue-green deployment strategy', complexity: 5, created: mthAgo(3, 7), deadlineDays: 14, status: 'COMPLETED' },
    { emp: david, title: 'Set Up Monitoring Stack', desc: 'Deploy Grafana + Prometheus for production monitoring', complexity: 5, created: mthAgo(2, 0), deadlineDays: 14, status: 'COMPLETED' },
    { emp: david, title: 'CI/CD Pipeline Refactor', desc: 'Migrate Jenkins pipelines to GitHub Actions', complexity: 4, created: mthAgo(1, 0), deadlineDays: 12, status: 'COMPLETED' },
    { emp: david, title: 'K8s Cluster Upgrade', desc: 'Upgrade EKS cluster to latest stable version', complexity: 5, created: mthAgo(0, -2), deadlineDays: 14, status: 'IN_PROGRESS' },

    // ── Eva: only 3 tasks — triggers cold-start "Collecting more data" ────────
    { emp: eva, title: 'Quarterly Sales Report', desc: 'Analyze Q4 sales metrics and create dashboard', complexity: 3, created: mthAgo(1, 0), deadlineDays: 7, status: 'COMPLETED' },
    { emp: eva, title: 'Churn Cohort Analysis', desc: 'Identify churn patterns in last 6 months', complexity: 4, created: mthAgo(0, -5), deadlineDays: 10, status: 'IN_PROGRESS' },
    { emp: eva, title: 'Customer Churn Analysis', desc: 'Build predictive model for customer retention', complexity: 5, created: mthAgo(0, 0), deadlineDays: 21, status: 'ASSIGNED' },
  ];

  let created = 0;
  for (const t of tasks) {
    const createdAt = t.created;
    const deadline = new Date(createdAt.getTime() + t.deadlineDays * 86400000);
    // Completed tasks: finished 1 day before deadline (early delivery)
    const completedAt = t.status === 'COMPLETED'
      ? new Date(deadline.getTime() - 86400000)
      : null;

    await prisma.task.create({
      data: {
        title: t.title,
        description: t.desc,
        status: t.status,
        complexity: t.complexity,
        deadline,
        employeeId: t.emp.id,
        organizationId: org.id,
        completedAt,
        createdAt,
      },
    });
    created++;
  }

  console.log(`✅ Seeded: 1 org, ${[alice, bob, carol, david, eva].length} employees, ${created} tasks across 5 months`);
  console.log('   Alice  → improving trend  (8 tasks, 5 months)');
  console.log('   Bob    → stable trend     (8 tasks, 5 months)');
  console.log('   Carol  → declining trend  (8 tasks, 5 months)');
  console.log('   David  → improving trend  (8 tasks, 5 months)');
  console.log('   Eva    → cold-start msg   (3 tasks, 1 month)');
  console.log('\n🔑 Admin login: admin@acmetech.com / password123');
  console.log('🔑 Employee login example: alice@acmetech.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
