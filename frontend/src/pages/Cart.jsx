import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Cart.css';

// ✅ LIVE PRODUCTION URL CONFIGURATION
const BACKEND_URL = "https://jamba-backend.onrender.com";

// ✅ STANDARDIZED RAZORPAY TEST KEY ID
const RAZORPAY_KEY_ID = "rzp_test_SvVCY9dpYnL1Kq";

// 🔥 THE BULLETPROOF FIX: Dynamically injects Razorpay right before checkout
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [savedAddress, setSavedAddress] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // The wake-up ping
  useEffect(() => {
    fetch(`${BACKEND_URL}/`).catch(() => console.log("Server waking up..."));
  }, []);

  // Fetch Address Logic
  useEffect(() => {
    async function loadAddress() {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().address) {
          setSavedAddress(docSnap.data().address);
        }
      }
    }
    loadAddress();
  }, [user]);

  const total = cart.reduce((acc, item) => {
    const itemPrice = item.price || item.selling_price || 0;
    return acc + (itemPrice * item.quantity);
  }, 0);

  const getItemImage = (item) => {
    if (item.image) return item.image; 
    if (item.images && item.images.length > 0) return item.images[0]; 
    return 'https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png'; 
  };

  // Razorpay Payment Logic
  const startPayment = async () => {
    if (!savedAddress) {
      alert("Please save your shipping address first!");
      navigate('/address');
      return;
    }

    setIsProcessing(true);

    // ✅ STEP 1: FORCE LOAD RAZORPAY
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      alert("Failed to load Razorpay gateway. Please check your internet connection.");
      setIsProcessing(false);
      return;
    }

    const customerEmail = user?.email || "guest@jambawear.com";

    try {
      // ✅ STEP 2: TALK TO YOUR PYTHON SERVER
      const res = await fetch(`${BACKEND_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cart, customer: customerEmail })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`The server at ${BACKEND_URL} returned a webpage instead of data. The server might be waking up or deployed incorrectly. Try again in 30 seconds.`);
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to establish database transaction.");
      }

      const order = await res.json();

      // ✅ STEP 3: OPEN RAZORPAY
      const options = {
        key: RAZORPAY_KEY_ID, 
        amount: order.amount,
        currency: order.currency,
        name: "JAMBA WEAR",
        description: "Official Store Procurement Pipeline",
        image: "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png",
        order_id: order.id,
        handler: async function (response) {
          await verifyPaymentWithBackend(response);
        },
        prefill: {
          name: savedAddress.name || "JAMBA Customer",
          email: customerEmail,
          contact: savedAddress.phone || ""
        },
        theme: { color: "#1a1a1a" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert("Razorpay Network Fault: " + response.error.description);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err) {
      alert("Network Interrupted: \n" + err.message);
      setIsProcessing(false);
    }
  };

  const verifyPaymentWithBackend = async (paymentData) => {
    try {
      const res = await fetch(`${BACKEND_URL}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Verification failed: Server returned HTML instead of JSON.");
      }

      if (!res.ok) throw new Error("Signature verification match rejected.");
      
      localStorage.removeItem('jambaCart'); 
      window.location.href = "/orders"; 
    } catch (err) {
      console.error("Verification Loop Broken:", err);
      alert("Payment cleared from ledger, but backend verification failed.\n" + err.message);
      setIsProcessing(false);
    }
  };

  // ---------------- RENDER ----------------
  return (
    <div className="container">
      <h1 className="page-title">Your Bag</h1>

      {cart.length === 0 ? (
        <div id="empty-cart-msg" style={{ display: 'block', textAlign: 'center', padding: '100px 20px' }}>
          <p>Your bag is currently empty.</p>
          <span 
            onClick={() => navigate('/')} 
            style={{ color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Browse Collections
          </span>
        </div>
      ) : (
        <>
          <div id="cart-items-container">
            {cart.map((item, index) => {
              const itemPrice = item.price || item.selling_price || 0;
              return (
                <div className="cart-item" key={`${item.id || index}-${item.size}`}>
                  <img src={getItemImage(item)} className="item-img" alt={item.title} />
                  <div className="item-info">
                    <p className="item-title">{item.title}</p>
                    <div className="item-meta">
                      <span>Size: {item.size}</span>
                      <div className="qty-wrapper">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.size, -1)}>-</button>
                        <input type="number" className="qty-input" value={item.quantity} readOnly />
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.size, 1)}>+</button>
                      </div>
                    </div>
                    <p className="item-price">₹{(itemPrice * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="remove-btn" onClick={() => removeFromCart(item.id, item.size)}>REMOVE</span>
                </div>
              );
            })}
          </div>

          <div className="address-box" id="address-preview">
            <div className="address-header">
              <span>Shipping To:</span>
              <span onClick={() => navigate('/address')} style={{ textDecoration: 'underline', color: 'var(--primary)', cursor: 'pointer' }}>Change</span>
            </div>
            <div id="address-content" className="address-text">
              {savedAddress ? (
                <>
                  <strong>{savedAddress.name}</strong><br />
                  {savedAddress.address1}{savedAddress.landmark ? `, ${savedAddress.landmark}` : ''}<br />
                  {savedAddress.district}, {savedAddress.state} - {savedAddress.pincode}<br />
                  Phone: {savedAddress.phone}
                </>
              ) : (
                <span className="no-address">
                  No address found! <span onClick={() => navigate('/address')} style={{ color: 'red', cursor: 'pointer', textDecoration: 'underline' }}>Add shipping details</span> before paying.
                </span>
              )}
            </div>
          </div>

          <div className="summary" id="cart-summary">
            <div className="summary-row"><span>Subtotal</span><span id="subtotal">₹{total.toLocaleString('en-IN')}</span></div>
            <div className="summary-row"><span>Shipping</span><span>FREE</span></div>
            <div className="summary-row total-row"><span>Order Total</span><span id="grand-total">₹{total.toLocaleString('en-IN')}</span></div>
            
            <button 
              className="checkout-btn" 
              id="pay-btn" 
              onClick={startPayment} 
              disabled={!savedAddress || isProcessing}
            >
              {isProcessing ? "Processing Securely..." : "Proceed to Payment"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}