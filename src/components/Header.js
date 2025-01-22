import React, { useContext, useState, useEffect } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import Signup from './Signup';
import '../styles/Header.css';
import { auth, provider, db } from '../firebase/firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';

const Header = ({ onSearch }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const [userProfileData, setUserProfileData] = useState(null);
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (currentUser.providerData[0]?.providerId === 'google.com') {
              setUserProfileData({
                ...data,
                photoURL: currentUser.photoURL
              });
            } else {
              setUserProfileData(data);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserProfileData(null);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, {
        email: user.email,
        photoURL: user.photoURL,
        fullName: user.displayName || 'User',
        lastLogin: new Date().toISOString(),
        provider: 'google'
      });

      setShowAuthModal(false);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfileMenu(false);
      setUserProfileData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openAuthModal = (type) => {
    setAuthType(type);
    setShowProfileMenu(false);
  };

  const getProfilePhotoUrl = () => {
    if (currentUser?.providerData[0]?.providerId === 'google.com') {
      return currentUser.photoURL;
    }
    return userProfileData?.photoURL;
  };

  if (authType === 'login') {
    return <Login onClose={() => setAuthType(null)} />;
  }

  if (authType === 'signup') {
    return <Signup onClose={() => setAuthType(null)} />;
  }

  return (
    <header className="header">
      <div className="header-left">
        <span className="material-icons header-pin-icon">push_pin</span>
        <h1>Pin Noter</h1>
      </div>

      {!isMobile && (
        <div className="header-center">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="material-icons search-icon">search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
              />
              {searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => {
                    setSearchQuery('');
                    onSearch('');
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="header-right">
        <button
          className="theme-button"
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            toggleTheme(nextTheme);
          }}
          aria-label={`Current theme: ${theme} mode`}
        >
          <span className="material-icons">
            {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'computer'}
          </span>
        </button>

        {isMobile && !isMobileSearchVisible && (
          <button 
            className="mobile-search-button" 
            onClick={() => setIsMobileSearchVisible(true)}
          >
            <span className="material-icons">search</span>
          </button>
        )}

        <div className="profile-container">
          {currentUser ? (
            <>
              <button
                className="profile-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {getProfilePhotoUrl() ? (
                  <img 
                    src={getProfilePhotoUrl()} 
                    alt="Profile"
                    className="profile-photo"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "";
                      e.target.className = "material-icons";
                      e.target.innerHTML = "account_circle";
                    }}
                  />
                ) : (
                  <span className="material-icons">account_circle</span>
                )}
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <div className="profile-info">
                    <p className="user-name">
                      {userProfileData?.fullName || currentUser.displayName || 'User'}
                    </p>
                    <p className="user-email">{currentUser.email}</p>
                  </div>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </>
          ) : (
            <div className="auth-container">
              <button
                className="profile-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <span className="material-icons">account_circle</span>
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <button onClick={() => openAuthModal('login')}>Login</button>
                  <button onClick={() => openAuthModal('signup')}>Sign Up</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isMobile && isMobileSearchVisible && (
        <div className="search-expanded">
          <div className="search-input-wrapper">
            <span className="material-icons search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              autoFocus
            />
            <button 
              className="clear-search"
              onClick={() => {
                setIsMobileSearchVisible(false);
                setSearchQuery('');
                onSearch('');
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;