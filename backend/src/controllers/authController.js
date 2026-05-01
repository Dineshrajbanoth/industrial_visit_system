const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeUpper(value) {
  return normalizeValue(value).toUpperCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateStrongPassword(password) {
  const checks = [
    { ok: password.length >= 8, message: 'Password must be at least 8 characters long.' },
    { ok: /[a-z]/.test(password), message: 'Password must include at least one lowercase letter.' },
    { ok: /[A-Z]/.test(password), message: 'Password must include at least one uppercase letter.' },
    { ok: /\d/.test(password), message: 'Password must include at least one number.' },
    { ok: /[^A-Za-z0-9]/.test(password), message: 'Password must include at least one special character.' },
  ];

  const failed = checks.find((item) => !item.ok);
  return failed ? failed.message : '';
}

function parseBooleanEnv(value, defaultValue = false) {
  const raw = normalizeValue(value).toLowerCase();
  if (!raw) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function parseWhitelist() {
  const source = process.env.ADMIN_WHITELIST_EMAILS || process.env.ADMIN_ALLOWED_EMAILS || '';
  return new Set(
    String(source)
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function assertAdminRegistrationAllowed(email, providedCode) {
  const registrationEnabled = parseBooleanEnv(process.env.ALLOW_ADMIN_REGISTRATION, false);
  const secret = normalizeValue(process.env.ADMIN_SECRET || process.env.ADMIN_REGISTRATION_SECRET);
  const whitelist = parseWhitelist();

  if (!registrationEnabled) {
    return {
      allowed: false,
      message: 'Admin registration is disabled. Set ALLOW_ADMIN_REGISTRATION=true.',
    };
  }

  if (!secret && whitelist.size === 0) {
    return {
      allowed: false,
      message: 'Admin registration is enabled but no access rule is configured. Set ADMIN_SECRET or ADMIN_WHITELIST_EMAILS.',
    };
  }

  if (secret && providedCode !== secret) {
    return {
      allowed: false,
      message: 'Invalid admin code.',
    };
  }

  if (whitelist.size > 0 && !whitelist.has(email)) {
    return {
      allowed: false,
      message: 'Email not authorized.',
    };
  }

  return { allowed: true };
}

function issueToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

async function adminLogin(req, res) {
  const { email, password } = req.body;
  const loginEmail = normalizeValue(email).toLowerCase();

  if (!loginEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!isValidEmail(loginEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email.' });
  }

  const admin = await Admin.findOne({ email: loginEmail }).select('+password').lean();

  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = issueToken({
    adminId: admin._id.toString(),
    role: 'admin',
    name: admin.name,
    email: admin.email,
  });

  return res.json({
    message: 'Login successful',
    token,
    user: {
      adminId: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: 'admin',
    },
  });
}

async function adminRegister(req, res) {
  const name = normalizeValue(req.body.name);
  const email = normalizeValue(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const adminCode = normalizeValue(req.body.adminCode);

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({
      message: 'Name, email, password and confirm password are required.',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match.' });
  }

  const weakReason = validateStrongPassword(password);
  if (weakReason) {
    return res.status(400).json({ message: weakReason });
  }

  const accessCheck = assertAdminRegistrationAllowed(email, adminCode);
  if (!accessCheck.allowed) {
    return res.status(403).json({ message: accessCheck.message });
  }

  const existing = await Admin.findOne({ email }).lean();
  if (existing) {
    return res.status(409).json({ message: 'Admin with this email already exists.' });
  }

  const saltRounds = Number(process.env.ADMIN_BCRYPT_ROUNDS || 12);
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const admin = await Admin.create({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
  });

  return res.status(201).json({
    message: 'Admin registration successful. Please login to continue.',
    admin: {
      adminId: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
}

async function studentLogin(req, res) {
  const rollNo = normalizeUpper(req.body.rollNo);
  const password = req.body.password;
  const branch = normalizeUpper(req.body.branch);
  const section = normalizeUpper(req.body.section);

  if (!rollNo) {
    return res.status(400).json({ message: 'Roll number is required.' });
  }

  let student;

  // Password-based login (preferred when password provided)
  if (password) {
    student = await Student.findOne({ rollNo }).select('+password');

    if (!student || !student.password) {
      return res.status(401).json({ message: 'Invalid credentials or password not set.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
  } else {
    // Legacy branch/section based login (fallback for existing flows)
    if (!branch || !section) {
      return res.status(400).json({ message: 'Roll number, branch and section are required when password is not provided.' });
    }

    student = await Student.findOne({ rollNo });

    if (student) {
      const storedBranch = normalizeUpper(student.branch);
      const storedSection = normalizeUpper(student.section);

      if (storedBranch !== branch || storedSection !== section) {
        return res.status(401).json({ message: 'Invalid student details.' });
      }

      // Normalize saved values
      if (student.branch !== storedBranch || student.section !== storedSection || student.rollNo !== rollNo) {
        student.branch = storedBranch;
        student.section = storedSection;
        student.rollNo = rollNo;
        await student.save();
      }
    } else {
      student = await Student.create({ rollNo, branch, section });
    }
  }

  const token = issueToken({
    role: 'student',
    studentId: student._id.toString(),
    rollNo: student.rollNo,
    branch: student.branch,
    section: student.section,
  });

  return res.json({
    message: 'Student login successful',
    token,
    user: {
      role: 'student',
      studentId: student._id.toString(),
      rollNo: student.rollNo,
      branch: student.branch,
      section: student.section,
    },
  });
}

async function studentRegister(req, res) {
  const rollNo = normalizeUpper(req.body.rollNo);
  const branch = normalizeUpper(req.body.branch);
  const section = normalizeUpper(req.body.section);
  const password = req.body.password;
  const name = normalizeValue(req.body.name);
  const email = normalizeValue(req.body.email).toLowerCase();

  if (!rollNo || !branch || !section || !password) {
    return res.status(400).json({ message: 'Roll number, branch, section and password are required.' });
  }

  const exists = await Student.findOne({ rollNo });
  if (exists) {
    return res.status(400).json({ message: 'Student with this roll number already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const student = await Student.create({
    rollNo,
    branch,
    section,
    password: hashed,
    name: name || undefined,
    email: email || undefined,
  });

  const token = issueToken({
    role: 'student',
    studentId: student._id.toString(),
    rollNo: student.rollNo,
    branch: student.branch,
    section: student.section,
  });

  return res.status(201).json({
    message: 'Student registered successfully',
    token,
    user: {
      role: 'student',
      studentId: student._id.toString(),
      rollNo: student.rollNo,
      branch: student.branch,
      section: student.section,
      name: student.name,
      email: student.email,
    },
  });
}

module.exports = {
  adminRegister,
  adminLogin,
  studentLogin,
  studentRegister,
  login: adminLogin,
};
