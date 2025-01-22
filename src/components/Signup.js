import React, { useState } from 'react';
import { auth, database } from '../firebase/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, serverTimestamp } from 'firebase/database';
import '../styles/Signup.css';
import Login from './Login';

const Signup = ({ onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      await set(ref(database, 'users/' + userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        createdAt: serverTimestamp()
      });

      onClose();
    } catch (error) {
      setError('Failed to create account: ' + error.message);
      setIsLoading(false);
    }
  };

  const toggleToLogin = () => {
    setIsLogin(true);
  };

  return (
    <div className="signup-auth-modal">
      <div className="signup-auth-modal-content">
        <button
          className="signup-close-button"
          onClick={onClose}
          aria-label="Close signup form"
        >
          <span className="material-icons">close</span>
        </button>

        <div className="signup-auth-form-wrapper">
          {isLogin ? (
            <Login onClose={onClose} />
          ) : (
            <form className="signup-auth-form" onSubmit={handleSubmit}>
              <h2>Create Account</h2>
              
              {error && (
                <div className="signup-error-message">
                  <span className="material-icons">error_outline</span>
                  {error}
                </div>
              )}

              <div className="signup-form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  className="signup-input-field"
                />
              </div>

              <div className="signup-form-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="signup-input-field"
                />
              </div>

              <div className="signup-form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  required
                  disabled={isLoading}
                  autoComplete="tel"
                  className="signup-input-field"
                />
              </div>

              <div className="signup-form-group signup-password-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="signup-input-field"
                />
                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-icons">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className="signup-form-group signup-password-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="signup-input-field"
                />
                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-icons">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <button 
                type="submit" 
                className={`signup-submit-button ${isLoading ? 'signup-loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? '' : 'Create your account'}
              </button>

              <p className="signup-toggle-link">
                Already have an account? 
                <button type="button" onClick={toggleToLogin}>Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;