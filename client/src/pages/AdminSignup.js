import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { z } from 'zod';
import './AdminPortal.css';

const adminSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminKey: z.string().min(1, 'Admin key is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const AdminSignup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', adminKey: '' });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    try {
      adminSignupSchema.parse(formData);
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
      const response = await axios.post('/api/admin-auth/signup', formData, {
        headers: {
          'x-admin-key': formData.adminKey
        }
      });
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
        <h2>Admin Sign Up</h2>
        <p className="helper-text">Hidden portal. Admin key required to create the first account.</p>
        {generalError && <div className="error-message">{generalError}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <input type="text" name="name" placeholder="Admin Name" value={formData.name} onChange={handleChange} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <input type="email" name="email" placeholder="Admin Email" value={formData.email} onChange={handleChange} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="form-group">
            <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>
          <div className="form-group">
            <input type="password" name="adminKey" placeholder="Admin Key" value={formData.adminKey} onChange={handleChange} />
            {errors.adminKey && <span className="field-error">{errors.adminKey}</span>}
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Admin Account'}</button>
        </form>

        <p className="portal-link-text">
          Already have an account? <button type="button" className="toggle-btn" onClick={() => navigate('/admin-login')}>Go to Sign In</button>
        </p>
      </div>
    </div>
  );
};

export default AdminSignup;
