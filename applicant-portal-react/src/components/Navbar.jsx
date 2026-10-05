import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Navbar.css';

const Navbar = () => {
  const { isLoggedIn, userName, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const logoLight = salesforceService.getAsset('logoLightUrl');
  const logoDark = salesforceService.getAsset('logoDarkUrl');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    salesforceService.logout();
  };

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className={`navbar-wrapper ${isScrolled ? 'navbar-wrapper-scrolled' : ''}`}>
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            <img 
              src={isScrolled ? (logoDark || logoLight) : (logoLight || logoDark)} 
              alt="Logo" 
              className="logo-img" 
            />
          </Link>
          
          <div className="navbar-center">
            <Link to="/" className="navbar-link">Home</Link>
            <Link to="/programs" className="navbar-link">Programs</Link>
            {isLoggedIn && (
              <>
                <Link to="/my-applications" className="navbar-link">My Applications</Link>
                <Link to="/profile" className="navbar-link">Profile</Link>
              </>
            )}
          </div>

          <div className="navbar-actions">
            {isLoggedIn ? (
              <>
                <span className="navbar-username">{userName}</span>
                <button onClick={handleLogout} className="navbar-btn">
                  Logout
                </button>
              </>
            ) : (
              <a href={salesforceService.loginUrl} className="navbar-btn">
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
