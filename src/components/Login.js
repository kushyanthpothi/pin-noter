import React, { useState } from 'react';
import { auth, provider } from '../firebase/firebase';
import { signInWithEmailAndPassword, signInWithPopup, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { FaGoogle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Signup from './Signup';
import '../styles/Login.css';

const Login = ({ onClose }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
    const [additionalInfo, setAdditionalInfo] = useState({
        fullName: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });

    const getCurrentUTCTimestamp = () => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAdditionalInfoChange = (e) => {
        setAdditionalInfo({ ...additionalInfo, [e.target.name]: e.target.value });
    };

    const validatePhoneNumber = (phoneNumber) => {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    };

    const validatePassword = (password) => {
        return password.length >= 8;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsEmailLoading(true);
        setError('');

        try {
            const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const user = result.user;
            const currentTime = getCurrentUTCTimestamp();

            const db = getDatabase();
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                await update(userRef, {
                    lastLogin: currentTime,
                    loginUsername: 'kushyanthpothi'
                });
            }

            toast.success('Signed in successfully!');
            onClose();
        } catch (error) {
            console.error('Login error:', error);
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('No account exists with this email');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password');
                    break;
                default:
                    setError('Invalid email or password');
            }
        } finally {
            setIsEmailLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError('');

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const currentTime = getCurrentUTCTimestamp();

            const db = getDatabase();
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);

            if (!snapshot.exists()) {
                await set(userRef, {
                    email: user.email,
                    fullName: user.displayName || '',
                    createdAt: currentTime,
                    lastLogin: currentTime,
                    provider: 'google',
                    loginUsername: 'kushyanthpothi'
                });
                setShowAdditionalInfo(true);
            } else {
                const userData = snapshot.val();
                if (!userData.hasPasswordAuth) {
                    setShowAdditionalInfo(true);
                } else {
                    await update(userRef, {
                        lastLogin: currentTime,
                        loginUsername: 'kushyanthpothi',
                        ...(user.displayName && { fullName: user.displayName })
                    });
                    toast.success('Signed in with Google successfully!');
                    onClose();
                }
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    setError('Sign-in cancelled');
                    break;
                case 'auth/popup-blocked':
                    setError('Pop-up blocked by browser');
                    break;
                default:
                    setError('Failed to sign in with Google');
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleAdditionalInfoSubmit = async (e) => {
        e.preventDefault();
        setIsEmailLoading(true);
        setError('');

        if (!validatePhoneNumber(additionalInfo.phoneNumber)) {
            setError('Please enter a valid phone number');
            setIsEmailLoading(false);
            return;
        }

        if (!validatePassword(additionalInfo.password)) {
            setError('Password must be at least 8 characters long');
            setIsEmailLoading(false);
            return;
        }

        if (additionalInfo.password !== additionalInfo.confirmPassword) {
            setError('Passwords do not match');
            setIsEmailLoading(false);
            return;
        }

        try {
            const currentTime = getCurrentUTCTimestamp();
            const db = getDatabase();
            const user = auth.currentUser;

            const credential = EmailAuthProvider.credential(
                user.email,
                additionalInfo.password
            );

            await linkWithCredential(user, credential);

            await update(ref(db, `users/${user.uid}`), {
                phoneNumber: additionalInfo.phoneNumber,
                fullName: additionalInfo.fullName || user.displayName,
                hasPasswordAuth: true,
                updatedAt: currentTime,
                loginUsername: 'kushyanthpothi',
                ...(!user.metadata.lastSignInTime && {
                    createdAt: currentTime,
                    provider: 'both',
                    email: user.email
                })
            });

            toast.success('Profile completed successfully!');
            onClose();
        } catch (error) {
            console.error('Additional info submission error:', error);
            if (error.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists');
            } else if (error.code === 'auth/requires-recent-login') {
                setError('Please sign in again to complete this action');
            } else {
                setError('Failed to save user information');
            }
        } finally {
            setIsEmailLoading(false);
        }
    };

    if (showAdditionalInfo) {
        return (
            <div className="login-auth-modal">
                <div className="login-auth-modal-content">
                    <button
                        className="login-close-button"
                        onClick={onClose}
                        aria-label="Close form"
                    >
                        <span className="material-icons">close</span>
                    </button>

                    <div className="login-auth-form-wrapper">
                        <form className="login-auth-form" onSubmit={handleAdditionalInfoSubmit}>
                            <h2>Complete Your Profile</h2>

                            {error && (
                                <div className="login-error-message">
                                    <span className="material-icons">error_outline</span>
                                    {error}
                                </div>
                            )}

                            <div className="login-form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    name="fullName"
                                    value={additionalInfo.fullName}
                                    onChange={handleAdditionalInfoChange}
                                    placeholder="John Doe"
                                    required
                                    disabled={isEmailLoading}
                                    className="login-input-field"
                                />
                            </div>

                            <div className="login-form-group">
                                <label htmlFor="phoneNumber">Phone Number</label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    name="phoneNumber"
                                    value={additionalInfo.phoneNumber}
                                    onChange={handleAdditionalInfoChange}
                                    placeholder="+1234567890"
                                    required
                                    disabled={isEmailLoading}
                                    className="login-input-field"
                                />
                            </div>

                            <div className="login-form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={additionalInfo.password}
                                    onChange={handleAdditionalInfoChange}
                                    placeholder="••••••••"
                                    required
                                    disabled={isEmailLoading}
                                    className="login-input-field"
                                />
                            </div>

                            <div className="login-form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    name="confirmPassword"
                                    value={additionalInfo.confirmPassword}
                                    onChange={handleAdditionalInfoChange}
                                    placeholder="••••••••"
                                    required
                                    disabled={isEmailLoading}
                                    className="login-input-field"
                                />
                            </div>

                            <button
                                type="submit"
                                className={`login-submit-button-first ${isEmailLoading ? 'login-loading' : ''}`}
                                disabled={isEmailLoading}
                            >
                                {isEmailLoading ? 'Saving...' : 'Complete Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (isSignup) {
        return <Signup onClose={onClose} />;
    }

    return (
        <div className="login-auth-modal">
            <div className="login-auth-modal-content">
                <button
                    className="login-close-button"
                    onClick={onClose}
                    aria-label="Close login form"
                >
                    <span className="material-icons">close</span>
                </button>

                <div className="login-auth-form-wrapper">
                    <form className="login-auth-form" onSubmit={handleSubmit}>
                        <h2>Welcome Back</h2>

                        {error && (
                            <div className="login-error-message">
                                <span className="material-icons">error_outline</span>
                                {error}
                            </div>
                        )}

                        <div className="login-form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@company.com"
                                required
                                disabled={isEmailLoading || isGoogleLoading}
                                autoComplete="email"
                                className="login-input-field"
                            />
                        </div>

                        <div className="login-form-group login-password-group">
                            <label htmlFor="password">Password</label>
                            <div className="login-password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    disabled={isEmailLoading || isGoogleLoading}
                                    autoComplete="current-password"
                                    className="login-input-field"
                                />
                                <button
                                    type="button"
                                    className="login-toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isEmailLoading || isGoogleLoading}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    <span className="material-icons">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`login-submit-button-first ${isEmailLoading ? 'login-loading' : ''}`}
                            disabled={isEmailLoading || isGoogleLoading}
                        >
                            {isEmailLoading ? 'Signing in...' : 'Sign in to your account'}
                        </button>
                    </form>

                    <button
                        className={`login-google-signin-button ${isGoogleLoading ? 'login-loading' : ''}`}
                        onClick={handleGoogleSignIn}
                        disabled={isEmailLoading || isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            'Waiting for confirmation...'
                        ) : (
                            <>
                                <span className="login-google-logo">
                                    <FaGoogle />
                                </span>
                                Sign in with Google
                            </>
                        )}
                    </button>

                    <div className="login-signup-prompt">
                        <p>Don't have an account? <button onClick={() => setIsSignup(true)}>Sign Up</button></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;