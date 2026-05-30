import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Navbar.css';

export default function Navbar() {
  const { user } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Calculate total items in the cart for the red badge
  const cartCount = cart.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);

  // Close dropdown if the user clicks anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Secure Firebase Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
      navigate('/login'); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {/* 1. THE STICKY WRAPPER: Holds both Navbar and Promo Banner */}
      <div className="fixed-header-wrapper">
        <header className="top-bar">
          <div className="logo">
            <Link to="/">
              <img src="https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png" alt="JAMBA WEAR Logo" />
            </Link>
          </div>
          
          <div className="right-actions">
            
            {/* LOGIN BUTTON: Visible only if NOT logged in */}
            {!user && (
              <Link to="/login" className="login-nav-btn">
                Login
              </Link>
            )}

            {/* CART ICON */}
            <Link to="/cart" className="action-item">
              <div className="cart-icon-wrapper">
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                {/* Only show the red dot if cart has items */}
                <span className="cart-badge" style={{ display: cartCount > 0 ? 'flex' : 'none' }}>
                  {cartCount}
                </span>
              </div>
              <span className="nav-text">Cart</span>
            </Link>

            {/* PROFILE ICON & DROPDOWN */}
            <div className="profile-wrapper" ref={dropdownRef}>
              <div className="action-item" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="nav-text">Profile</span>
              </div>
              
              {/* Dropdown Menu Box */}
              <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                <div className="dropdown-header">
                  {user ? `Hi, ${user.displayName || "Member"}` : "Hi, JAMBA Member"}
                </div>
                
                {/* Dropdown Options (Guest vs Logged In) */}
                {!user && (
                  <Link to="/login" onClick={() => setDropdownOpen(false)}>Login / Signup</Link>
                )}

                <Link to="/orders" onClick={() => setDropdownOpen(false)}>Orders</Link>
                <Link to="/address" onClick={() => setDropdownOpen(false)}>Address</Link>
                {/* 👇 THIS IS THE ONLY LINE THAT WAS CHANGED 👇 */}
                <Link to="/wishlist" onClick={() => setDropdownOpen(false)}>Wishlist</Link>
                <Link to="/contact" onClick={() => setDropdownOpen(false)}>Contact Us</Link>
                
                {user && (
                  <span className="logout-link" onClick={handleLogout}>Logout</span>
                )}
              </div>
            </div>
            
          </div>
        </header>

        {/* PROMO BANNER: Inside the sticky wrapper, directly under the header */}
        <div className="promo-banner">Free Delivery Order Above ₹2000</div>
      </div>

      {/* 2. THE SPACER: Pushes the page content down so it doesn't hide behind the fixed header */}
      <div className="header-spacer"></div>
    </>
  );
}