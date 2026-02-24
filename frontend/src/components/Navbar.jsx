import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';
import logo from '../assets/logo-navbar.png';

function Navbar() {
  return (
    <nav className="cosmic-navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img src={logo} alt="Logo" className="navbar-logo" />
          <h1 className="brand-title">ANTERIX CLUB</h1>
          {/* <div className="brand-subtitle">Live Championship System</div> */}
        </div>
        
        <div className="navbar-links">
          <NavLink 
            to="/leaderboard" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Leaderboard</span>
          </NavLink>
          
          <NavLink 
            to="/editor" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">✏️</span>
            <span className="nav-text">Editor</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
