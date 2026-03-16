import 'dotenv/config';
import { createDb } from './client.js';
import {
  users,
  organizations,
  organizationMembers,
  projects,
} from './schema/index.js';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  console.log('Seeding database...');

  // ── Create test user ────────────────────────────────────────────────────

  const [testUser] = await db
    .insert(users)
    .values({
      email: 'admin@toa.dev',
      name: 'Admin User',
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (!testUser) {
    console.log('Test user already exists, skipping seed.');
    return;
  }

  console.log(`  Created user: ${testUser.email} (${testUser.id})`);

  // ── Create test organization ────────────────────────────────────────────

  const [testOrg] = await db
    .insert(organizations)
    .values({
      name: 'Acme Corp',
      slug: 'acme-corp',
      plan: 'pro',
    })
    .returning();

  console.log(`  Created organization: ${testOrg!.name} (${testOrg!.id})`);

  // ── Add user as org owner ───────────────────────────────────────────────

  await db.insert(organizationMembers).values({
    organizationId: testOrg!.id,
    userId: testUser.id,
    role: 'owner',
  });

  console.log(`  Added ${testUser.email} as owner of ${testOrg!.name}`);

  // ── Create sample project ──────────────────────────────────────────────

  const [sampleProject] = await db
    .insert(projects)
    .values({
      organizationId: testOrg!.id,
      name: 'Content Pipeline',
      slug: 'content-pipeline',
      description:
        'Automated content generation and review pipeline using AI agent teams.',
      settings: {
        defaultModel: 'claude-sonnet-4-20250514',
        maxConcurrentExecutions: 5,
      },
    })
    .returning();

  console.log(`  Created project: ${sampleProject!.name} (${sampleProject!.id})`);

  console.log('\nSeed completed successfully!');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
