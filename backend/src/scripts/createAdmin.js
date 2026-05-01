const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const Admin = require('../models/Admin');

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return String(process.argv[index + 1] || '').trim();
}

function normalize(value) {
  return String(value || '').trim();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

async function run() {
  const mongoUri = normalize(process.env.MONGODB_URI);
  const name = normalize(getArgValue('--name'));
  const email = normalize(getArgValue('--email')).toLowerCase();
  const password = normalize(getArgValue('--password'));

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in backend .env');
  }

  if (!name || !email || !password) {
    throw new Error('Usage: npm run create-admin -- --name "Admin Name" --email "admin@example.com" --password "Strong@123"');
  }

  if (!validateEmail(email)) {
    throw new Error('Please provide a valid admin email.');
  }

  const passwordIssue = validatePassword(password);
  if (passwordIssue) {
    throw new Error(passwordIssue);
  }

  const rounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 12);

  await mongoose.connect(mongoUri);

  const existing = await Admin.findOne({ email }).lean();
  if (existing) {
    throw new Error('Admin with this email already exists. Use a different email or login with existing account.');
  }

  const hashed = await bcrypt.hash(password, rounds);

  const admin = await Admin.create({
    name,
    email,
    password: hashed,
    role: 'admin',
  });

  console.log('Admin created successfully.');
  console.log(`Admin ID: ${admin._id.toString()}`);
  console.log(`Email: ${admin.email}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Create admin failed: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // ignore disconnect errors
    }
    process.exit(1);
  });
