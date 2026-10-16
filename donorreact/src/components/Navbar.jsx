import salesforceService from '../services/salesforceService';
import './Navbar.css';

const Navbar = () => {
  const logoLight = salesforceService.getAsset('logoLightUrl');
  const logoDark = salesforceService.getAsset('logoDarkUrl');

  return (
    <nav className="donor-navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          {logoDark || logoLight ? (
            <img src={logoDark || logoLight} alt="GEMS Logo" className="logo-img" />
          ) : (
            <span className="logo-text">GEMS <span>Donor Portal</span></span>
          )}
        </div>
        <div className="navbar-right">
          <span className="portal-badge">Public Giving Gateway</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
