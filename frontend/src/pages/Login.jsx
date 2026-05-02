import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const branchOptions = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'];
const sectionOptions = ['A', 'B', 'C', 'D'];

function Login() {
  const navigate = useNavigate();
  const { loginAdmin, loginStudent, isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('admin');
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [studentForm, setStudentForm] = useState({ 
    rollNo: '', 
    password: '',
    branch: 'CSE', 
    section: 'A' 
  });
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ rollNo: '', branch: 'CSE', section: 'A', password: '', name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'student' ? '/student-dashboard' : '/admin-dashboard'} replace />;
  }

  const validatePassword = (password) => {
    const errors = {};
    if (!password) {
      errors.empty = 'Password is required';
    } else {
      if (password.length < 6) {
        errors.length = 'Password must be at least 6 characters';
      }
      if (!/[a-z]/.test(password)) {
        errors.lowercase = 'Password must contain lowercase letters';
      }
      if (!/[A-Z]/.test(password)) {
        errors.uppercase = 'Password must contain uppercase letters';
      }
      if (!/[0-9]/.test(password)) {
        errors.number = 'Password must contain numbers';
      }
    }
    return errors;
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await loginAdmin(adminForm);
      navigate('/admin-dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    
    // Validate password during registration
    const errors = validatePassword(registerForm.password);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      toast.error('Password does not meet security requirements');
      return;
    }

    setLoading(true);

    try {
      const { authApi } = await import('../services/api');
      await authApi.studentRegister(registerForm);
      toast.success('Registration successful. Signing you in...');
      await loginStudent({ rollNo: registerForm.rollNo, password: registerForm.password });
      navigate('/student-dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    
    if (!studentForm.rollNo.trim() || !studentForm.password.trim()) {
      toast.error('Please enter both roll number and password');
      return;
    }

    setLoading(true);

    try {
      await loginStudent(studentForm);
      navigate('/student-dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Student login failed.');
    } finally {
      setLoading(false);
    }
  };

  const tabButtonClass = (tab) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-ocean text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl overflow-hidden">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">Industrial Visit Dashboard</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-ink">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-500">Choose admin access to manage visits or student access to see your assigned visits.</p>
        </div>

        <div className="mb-6 inline-flex rounded-full bg-slate-100 p-1">
          <button type="button" className={tabButtonClass('admin')} onClick={() => setActiveTab('admin')}>
            Admin Login
          </button>
          <button type="button" className={tabButtonClass('student')} onClick={() => setActiveTab('student')}>
            Student Login
          </button>
        </div>

        {activeTab === 'admin' ? (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAdminSubmit}>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Email
              <input
                required
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                placeholder="admin@example.com"
                value={adminForm.email}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium text-slate-600 md:col-span-2">
              Password
              <input
                required
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                value={adminForm.password}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Admin Login'}
              </Button>
            </div>
            <p className="text-sm text-slate-600 md:col-span-2 text-center">
              Need to create an admin account?{' '}
              <Link className="text-ocean underline" to="/admin-register">
                Open Admin Registration
              </Link>
            </p>
          </form>
        ) : (
          <div>
            {!showRegister ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleStudentSubmit}>
                <label className="text-sm font-medium text-slate-600 md:col-span-2">
                  Roll Number
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="e.g., CSE001"
                    value={studentForm.rollNo}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, rollNo: e.target.value.toUpperCase() }))}
                  />
                </label>
                <label className="text-sm font-medium text-slate-600 md:col-span-2">
                  Password
                  <input
                    required
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="Enter your password"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-slate-500">Password is required. You can set one during registration.</p>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Branch
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    value={studentForm.branch}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, branch: e.target.value }))}
                  >
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Section
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    value={studentForm.section}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, section: e.target.value }))}
                  >
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Student Login'}
                  </Button>
                </div>
                <div className="md:col-span-2 text-sm text-center">
                  <button type="button" className="text-ocean underline" onClick={() => setShowRegister(true)}>
                    Register as New Student
                  </button>
                </div>
              </form>
            ) : (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRegisterSubmit}>
                <label className="text-sm font-medium text-slate-600 md:col-span-2">
                  Roll Number
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="e.g., CSE001"
                    value={registerForm.rollNo}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, rollNo: e.target.value.toUpperCase() }))}
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Branch
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    value={registerForm.branch}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, branch: e.target.value }))}
                  >
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Section
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    value={registerForm.section}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, section: e.target.value }))}
                  >
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600 md:col-span-2">
                  Password
                  <input
                    required
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="Create a strong password"
                    value={registerForm.password}
                    onChange={(e) => {
                      setRegisterForm((prev) => ({ ...prev, password: e.target.value }));
                      if (e.target.value) {
                        setPasswordErrors(validatePassword(e.target.value));
                      } else {
                        setPasswordErrors({});
                      }
                    }}
                  />
                  <div className="mt-2 space-y-1">
                    {Object.entries(passwordErrors).map(([key, error]) => (
                      <p key={key} className="text-xs text-red-600">
                        • {error}
                      </p>
                    ))}
                    {Object.keys(passwordErrors).length === 0 && registerForm.password && (
                      <p className="text-xs text-green-600">✓ Password meets security requirements</p>
                    )}
                  </div>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Name (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="Your full name"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Email (optional)
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
                    placeholder="your@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full" disabled={loading || Object.keys(passwordErrors).length > 0}>
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </Button>
                </div>
                <div className="md:col-span-2 text-sm text-center">
                  <button type="button" className="text-ocean underline" onClick={() => setShowRegister(false)}>
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Login;