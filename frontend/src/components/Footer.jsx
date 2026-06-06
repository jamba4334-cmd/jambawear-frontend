import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="seo-footer">
      <p><strong>JAMBA WEAR</strong></p>
      <div className="footer-links">
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/shipping">Shipping Policy</Link>
        <Link to="/refunds">Cancellation & Refunds</Link>
        <Link to="/contact">Contact Us</Link>
      </div>
      <p className="copyright">&copy; 2026 Authentic Traditional Fashion.</p>
    </footer>
  );
}