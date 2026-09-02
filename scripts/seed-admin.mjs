import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

dotenv.config({ path: envPath });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
  process.exit(1);
}

// 1. Determine Admin Email and Password
const cliEmail = process.argv[2];
const cliPassword = process.argv[3];

const adminEmail = (
  cliEmail ||
  process.env.ADMIN_EMAIL ||
  (process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',')[0].trim() : '') ||
  'admin@reginaseptianadrah.my.id'
).toLowerCase().trim();

const adminPassword = (
  cliPassword ||
  process.env.ADMIN_PASSWORD ||
  'Admin@123456'
);

if (!adminEmail || !adminEmail.includes('@')) {
  console.error(`Error: Invalid email address '${adminEmail}'`);
  process.exit(1);
}

if (adminPassword.length < 6) {
  console.error('Error: Password must be at least 6 characters long');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureAdminUser() {
  console.log(`\nConnecting to Supabase at: ${url}`);
  console.log(`Target admin account: ${adminEmail}`);

  // Check if user already exists
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to query existing users: ${listError.message}`);
  }

  const existingUser = listData.users.find(
    (user) => user.email?.toLowerCase() === adminEmail
  );

  let userId;

  if (existingUser) {
    console.log(`User '${adminEmail}' already exists (ID: ${existingUser.id}). Updating password and confirming email...`);
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        email_confirm: true,
        user_metadata: { ...existingUser.user_metadata, role: 'admin' },
      }
    );

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    userId = updateData.user.id;
    console.log(`User password updated and email verified successfully.`);
  } else {
    console.log(`Creating new user '${adminEmail}' with confirmed email...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    userId = createData.user.id;
    console.log(`User created successfully (ID: ${userId}).`);
  }

  // 2. Ensure ADMIN_EMAILS in .env.local contains this email
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const currentAdminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!currentAdminEmails.includes(adminEmail)) {
      console.log(`Adding '${adminEmail}' to ADMIN_EMAILS allowlist in .env.local...`);
      const newAdminEmails = [...currentAdminEmails, adminEmail].join(',');
      if (/^ADMIN_EMAILS=.*$/m.test(envContent)) {
        envContent = envContent.replace(/^ADMIN_EMAILS=.*$/m, `ADMIN_EMAILS=${newAdminEmails}`);
      } else {
        envContent += `\nADMIN_EMAILS=${newAdminEmails}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`Updated .env.local with ADMIN_EMAILS=${newAdminEmails}`);
    } else {
      console.log(`'${adminEmail}' is already authorized in ADMIN_EMAILS.`);
    }
  }

  console.log('\n======================================================');
  console.log(' Admin CMS Account Ready! ');
  console.log('======================================================');
  console.log(` Email    : ${adminEmail}`);
  console.log(` Password : ${adminPassword}`);
  console.log(` Login URL: http://localhost:3000/admin (after running 'npm run dev')`);
  console.log('======================================================\n');
}

ensureAdminUser().catch((err) => {
  console.error('\nSeed admin failed:', err.message || err);
  process.exit(1);
});
