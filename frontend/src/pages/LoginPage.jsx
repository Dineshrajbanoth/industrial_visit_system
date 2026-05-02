import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
    } catch (error) {
      if (!error.response) {
        toast.error('Cannot reach the server. Check API URL/network/firewall.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="font-heading text-2xl font-semibold text-ink">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to manage visits, feedback, and gallery images.</p>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default LoginPage;
