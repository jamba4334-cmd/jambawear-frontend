import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { cart: globalCart, updateQuantity: globalUpdateQuantity, removeFromCart: globalRemoveFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const isBuyNowMode = queryParams.get('mode') === 'buynow';

  const [activeCart, setActiveCart] = useState([]);
  const [savedAddress, setSavedAddress] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ NEW: Payment Method State
  const [paymentMethod, setPaymentMethod] = useState('online');

  useEffect(() => {
    fetch(`${BACKEND_URL}/`).catch(() => console.log("Server waking up..."));
  }, []);

  useEffect(() => {
    if (isBuyNowMode) {
      const buyNowItems = JSON.parse(localStorage.getItem('jambaBuyNow')) || [];
      setActiveCart(buyNowItems);
    } else {
      setActiveCart(globalCart);
    }
  }, [isBuyNowMode, globalCart]);

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

  const handleUpdateQuantity = (id, size, change) => {
    if (isBuyNowMode) {
      const updated = activeCart.map(item => {
        if (item.id === id && item.size === size) {
          return { ...item, quantity: Math.max(1, item.quantity + change) };
        }
        return item;
      });
      setActiveCart(updated);
      localStorage.setItem('jambaBuyNow', JSON.stringify(updated));
    } else {
      globalUpdateQuantity(id, size, change);
    }
  };

  const handleRemoveItem = (id, size) => {
    if (isBuyNowMode) {
      const updated = activeCart.filter(item => !(item.id === id && item.size === size));
      setActiveCart(updated);
      localStorage.setItem('jambaBuyNow', JSON.stringify(updated));
      if (updated.length === 0) navigate('/cart');
    } else {
      globalRemoveFromCart(id, size);
    }
  };

  const subtotal = activeCart.reduce((acc, item) => {
    const itemPrice = item.price || item.selling_price || 0;
    return acc + (itemPrice * item.quantity);
  }, 0);

  const shippingCost = (subtotal > 0 && subtotal < 1999) ? 149 : 0;
  const grandTotal = subtotal + shippingCost;

  const getItemImage = (item) => {
    if (item.image) return item.image; 
    if (item.images && item.images.length > 0) return item.images[0]; 
    return 'https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png'; 
  };

  // ✅ UPDATED Checkout Logic to handle COD
  const startPayment = async () => {
    if (!savedAddress) {
      alert("Please save your shipping address first!");
      navigate('/address');
      return;
    }

    setIsProcessing(true);
    const customerEmail = user?.email || "guest@jambawear.com";

    // Only load Razorpay script if they chose online payment
    if (paymentMethod === 'online') {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert("Failed to load Razorpay gateway. Please check your internet connection.");
        setIsProcessing(false);
        return;
      }
    }

    try {
      // ✅ Send the paymentMethod to the Python backend
      const res = await fetch(`${BACKEND_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cart: activeCart, 
          customer: customerEmail,
          userId: user?.uid, // Send uid for secure order viewing later
          shippingCost: shippingCost,
          paymentMethod: paymentMethod
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to establish database transaction.");
      }

      const orderResponse = await res.json();

      // ✅ IF COD: Skip Razorpay and go straight to success
      if (paymentMethod === 'cod') {
        if (isBuyNowMode) {
          localStorage.removeItem('jambaBuyNow');
        } else {
          localStorage.removeItem('jambaCart'); 
          window.dispatchEvent(new Event('cartUpdated')); 
        }
        navigate("/success"); // ✅ Routes to the new animated success page
        return;
      }

      // ✅ IF ONLINE: Open Razorpay normally
      const options = {
        key: RAZORPAY_KEY_ID, 
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "JAMBA WEAR",
        description: "Official Store Procurement Pipeline",
        image: "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png",
        order_id: orderResponse.id,
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

      if (!res.ok) throw new Error("Signature verification match rejected.");
      
      if (isBuyNowMode) {
        localStorage.removeItem('jambaBuyNow');
      } else {
        localStorage.removeItem('jambaCart'); 
        window.dispatchEvent(new Event('cartUpdated')); 
      }
      
      navigate("/success"); // ✅ Routes to the new animated success page
    } catch (err) {
      alert("Payment cleared from ledger, but backend verification failed.\n" + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">{isBuyNowMode ? "Buy Now Checkout" : "Your Bag"}</h1>

      {activeCart.length === 0 ? (
        <div id="empty-cart-msg" style={{ display: 'block', textAlign: 'center', padding: '100px 20px' }}>
          <p>{isBuyNowMode ? "Your fast-track item was removed." : "Your bag is currently empty."}</p>
          <span onClick={() => navigate('/')} style={{ color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
            Browse Collections
          </span>
        </div>
      ) : (
        <>
          {isBuyNowMode && globalCart.length > 0 && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '10px', textAlign: 'center', marginBottom: '20px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
                You are purchasing a single item. <span onClick={() => navigate('/cart')} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>View your full cart instead</span>.
              </p>
            </div>
          )}

          <div id="cart-items-container">
            {activeCart.map((item, index) => {
              const itemPrice = item.price || item.selling_price || 0;
              return (
                <div className="cart-item" key={`${item.id || index}-${item.size}`}>
                  <img src={getItemImage(item)} className="item-img" alt={item.title} />
                  <div className="item-info">
                    <p className="item-title">{item.title}</p>
                    <div className="item-meta">
                      <span>Size: {item.size}</span>
                      <div className="qty-wrapper">
                        <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.size, -1)}>-</button>
                        <input type="number" className="qty-input" value={item.quantity} readOnly />
                        <button className="qty-btn" onClick={() => handleUpdateQuantity(item.id, item.size, 1)}>+</button>
                      </div>
                    </div>
                    <p className="item-price">₹{(itemPrice * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="remove-btn" onClick={() => handleRemoveItem(item.id, item.size)}>REMOVE</span>
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
            {/* ✅ NEW: Payment Method Selector */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Payment Method</h4>
              
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="online" 
                  checked={paymentMethod === 'online'} 
                  onChange={() => setPaymentMethod('online')}
                  style={{ marginRight: '10px', cursor: 'pointer' }}
                />
                <strong>Pay Online (UPI, Cards, NetBanking)</strong>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="cod" 
                  checked={paymentMethod === 'cod'} 
                  onChange={() => setPaymentMethod('cod')}
                  style={{ marginRight: '10px', cursor: 'pointer' }}
                />
                <strong>Cash on Delivery (COD)</strong>
              </label>
            </div>

            {shippingCost > 0 && (
              <div style={{ backgroundColor: '#eef6f9', color: '#31708f', padding: '8px', fontSize: '13px', textAlign: 'center', marginBottom: '15px', borderRadius: '4px' }}>
                Add <strong>₹{(1999 - subtotal).toLocaleString('en-IN')}</strong> more to get Free Shipping!
              </div>
            )}
            
            <div className="summary-row"><span>Subtotal</span><span id="subtotal">₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="summary-row">
              <span>Shipping</span>
              <span style={{ color: shippingCost === 0 ? 'var(--primary)' : 'inherit' }}>
                {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
              </span>
            </div>
            <div className="summary-row total-row"><span>Order Total</span><span id="grand-total">₹{grandTotal.toLocaleString('en-IN')}</span></div>
            
            <button 
              className="checkout-btn" 
              id="pay-btn" 
              onClick={startPayment} 
              disabled={!savedAddress || isProcessing}
            >
              {isProcessing ? "Processing..." : paymentMethod === 'cod' ? "Place COD Order" : "Proceed to Payment"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}