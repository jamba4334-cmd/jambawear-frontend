import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Adjust this path if your firebase.js is somewhere else!
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const customerIdentifier = user.email || user.phoneNumber;
        fetchUserOrders(customerIdentifier);
      } else {
        // Redirect to login if not authenticated
        navigate('/login?redirect=orders');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserOrders = async (customerIdentifier) => {
    try {
      const q = query(collection(db, "orders"), where("customer", "==", customerIdentifier));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setOrders([]);
        setLoading(false);
        return;
      }

      let ordersArray = [];
      querySnapshot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        ordersArray.push(data);
      });

      // Sort newest to oldest
      ordersArray.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setOrders(ordersArray);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(true);
      setLoading(false);
    }
  };

  // Helper function to calculate the 15-day auto-pilot logic
  const getOrderStatus = (order) => {
    const orderTime = order.createdAt ? order.createdAt.toDate() : new Date();
    const now = new Date();
    const timeDiff = now.getTime() - orderTime.getTime();
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    const daysElapsed = timeDiff / (1000 * 60 * 60 * 24);

    let status = "processing";
    let deliveryText = "Estimated Delivery: 12 - 15 Days";
    let boxStyle = { background: '#f0f8ff', color: '#0056b3', borderColor: '#b8daff' };
    let icon = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
    );

    if (daysElapsed >= 15) {
      status = "delivered";
      deliveryText = "Delivered Successfully";
      boxStyle = { background: '#d4edda', color: '#155724', borderColor: '#c3e6cb' };
      icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    } else if (hoursElapsed >= 24) {
      status = "shipped";
      deliveryText = "Shipped - On its way!";
    }

    if (order.status && order.status.toLowerCase() === "cancelled") {
      status = "cancelled";
      deliveryText = "Order Cancelled";
      boxStyle = { background: '#f8d7da', color: '#721c24', borderColor: '#f5c6cb' };
      icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    }

    return { status, deliveryText, boxStyle, icon };
  };

  return (
    <main className="orders-container">
      <h1 className="page-title">Order History</h1>

      {loading && <div className="loading-msg">Fetching your secure orders...</div>}
      {error && <div className="loading-msg">Error loading orders. Please try again later.</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-msg">
          <p>Your bag has been empty. Let's change that.</p>
          <Link to="/" className="shop-now-btn">Start Shopping</Link>
        </div>
      )}

      {!loading && orders.map((order) => {
        const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently";
        const { status, deliveryText, boxStyle, icon } = getOrderStatus(order);

        return (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div>
                <p className="order-id">Order #{order.id.substring(0, 8).toUpperCase()}</p>
                <p className="order-date">{orderDate}</p>
              </div>
              <span className={`status ${status}`}>{status}</span>
            </div>

            <div className="order-items">
              {order.items && order.items.map((item, index) => (
                <div key={index} className="order-item-detail">
                  <img src={item.image || "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png"} className="order-item-img" alt={item.title} />
                  <div className="order-item-info">
                    <p className="order-item-title">{item.title}</p>
                    <p className="order-item-meta">Size: {item.size || 'Standard'} | Qty: {item.quantity}</p>
                    <p className="order-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="delivery-estimate" style={boxStyle}>
              {icon}
              {deliveryText}
            </div>

            <div className="order-total">
              <span>Total Paid</span>
              <span>₹{(order.totalAmount || order.amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        );
      })}
    </main>
  );
}