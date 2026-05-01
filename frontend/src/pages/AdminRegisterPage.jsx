import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  adminCode: '',
};

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

function AdminRegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const passwordIssue = useMemo(() => validatePassword(form.password), [form.password]);
  const confirmIssue = useMemo(() => {
    if (!form.confirmPassword) return '';
    return form.password === form.confirmPassword ? '' : 'Passwords do not match.';
  }, [form.password, form.confirmPassword]);

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'student' ? '/student-dashboard' : '/admin-dashboard'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (passwordIssue) {
      toast.error(passwordIssue);
      return;
    }

    if (confirmIssue) {
      toast.error(confirmIssue);
      return;
    }

    setLoading(true);

    try {
      await authApi.adminRegister(form);
      toast.success('Admin account created. Please login.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Admin registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <h1 className="font-heading text-2xl font-semibold text-ink">Admin Registration</h1>
        <p className="mt-2 text-sm text-slate-500">
          This registration is protected. You must have an approved email and/or valid admin code.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-600 md:col-span-2">
            Name
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-600 md:col-span-2">
            Email
            <input
              required
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-600">
            Password
            <input
              required
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-600">
            Confirm Password
            <input
              required
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-600 md:col-span-2">
            Admin Secret Code
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form.adminCode}
              onChange={(e) => setForm((prev) => ({ ...prev, adminCode: e.target.value }))}
              placeholder="Required if server uses ADMIN_SECRET"
            />
          </label>

          {(passwordIssue || confirmIssue) && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {passwordIssue || confirmIssue}
            </div>
          )}

          <div className="md:col-span-2 space-y-3">
            <Button type="submit" className="w-full" disabled={loading || !!passwordIssue || !!confirmIssue}>
              {loading ? 'Creating account...' : 'Create Admin Account'}
            </Button>
            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-ocean underline">
                Go to login
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AdminRegisterPage;
