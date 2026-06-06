import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { z } from 'zod';
import './AdminPortal.css';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    try {
      adminLoginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors = {};
        error.errors.forEach((item) => {
          nextErrors[item.path[0]] = item.message;
        });
        setErrors(nextErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setGeneralError('');

    try {
      const response = await axios.post('/api/admin-auth/login', formData);
      const { token, admin } = response.data;
      login(admin, token, 'admin');
      navigate('/admin-dashboard');
    } catch (error) {
      setGeneralError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
  };

  return (
    <div className="admin-portal-shell">
      <div className="admin-portal-card">
        <h2>Admin Sign In</h2>
        <p className="helper-text">Hidden portal for school administration.</p>
        {generalError && <div className="error-message">{generalError}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <input type="email" name="email" placeholder="Admin Email" value={formData.email} onChange={handleChange} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <p className="portal-link-text">
          Need an account? <button type="button" className="toggle-btn" onClick={() => navigate('/admin-signup')}>Go to Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
