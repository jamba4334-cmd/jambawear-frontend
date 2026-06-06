import React from 'react';
import { Link } from 'react-router-dom';
import './OrderSuccess.css';

export default function OrderSuccess() {
  return (
    <div className="success-page-wrapper">
      <div className="success-card">
        
        {/* Animated Checkmark SVG */}
        <div className="success-animation-container">
          <svg className="animated-check" viewBox="0 0 52 52">
            <circle className="animated-check-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="animated-check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <div className="success-text-content">
          <h1 className="success-title">Thank You For Shopping!</h1>
          <p className="success-subtitle">Your order has been successfully placed and is being processed.</p>
        </div>

        <div className="success-actions">
          <Link to="/" className="shop-more-btn">Shop More</Link>
          <Link to="/orders" className="view-orders-link">View My Orders</Link>
        </div>

      </div>
    </div>
  );
}