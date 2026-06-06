import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Wishlist.css';

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Pass the user's secure UID instead of email
        fetchWishlistData(user.uid);
      } else {
        // If they aren't logged in, send them to login before viewing wishlist
        navigate('/login?redirect=wishlist');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchWishlistData = async (uid) => {
    try {
      // 1. Get all wishlist records from this specific user's secure subfolder
      const wishlistRef = collection(db, 'users', uid, 'wishlist');
      const wishlistSnapshot = await getDocs(wishlistRef);

      if (wishlistSnapshot.empty) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      // 2. Extract just the product IDs
      const productIds = wishlistSnapshot.docs.map(doc => doc.data().productId);

      // 3. Fetch the LIVE product data for each ID
      const fetchedProducts = [];
      
      // Using Promise.all to fetch them all at the same time for speed
      await Promise.all(productIds.map(async (productId) => {
        // Try querying by item_id first
        const productQuery = query(collection(db, "products"), where("item_id", "==", productId));
        const pSnapshot = await getDocs(productQuery);
        
        if (!pSnapshot.empty) {
          const pData = pSnapshot.docs[0].data();
          pData.id = pData.item_id || pSnapshot.docs[0].id;
          fetchedProducts.push(pData);
        } else {
          // Fallback to checking the document ID directly
          const docRef = doc(db, "products", productId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const pData = docSnap.data();
            pData.id = docSnap.id;
            fetchedProducts.push(pData);
          }
        }
      }));

      setWishlistItems(fetchedProducts);
      setLoading(false);

    } catch (error) {
      console.error("Error fetching wishlist:", error);
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    try {
      // Remove from the secure Firebase subfolder
      await deleteDoc(doc(db, 'users', uid, 'wishlist', productId));
      
      // Instantly remove from the screen without reloading
      setWishlistItems(prev => prev.filter(item => item.id !== productId));
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const moveToCart = (item) => {
    // 1. Get current cart from local storage
    const cart = JSON.parse(localStorage.getItem('jambaCart')) || [];
    
    // 2. Add to cart (defaulting to medium/standard size if required)
    const sizeToUse = item.requires_size === false ? "One Size" : "M";
    const existingItem = cart.find(cartItem => cartItem.id === item.id && cartItem.size === sizeToUse);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        price: item.selling_price,
        image: item.images?.[0] || "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png",
        size: sizeToUse,
        quantity: 1
      });
    }
    
    localStorage.setItem('jambaCart', JSON.stringify(cart));
    
    // 3. Remove from wishlist database
    removeFromWishlist(item.id);
    
    // 4. Update Navbar badge
    window.dispatchEvent(new Event('cartUpdated'));
  };

  if (loading) {
    return <main className="wishlist-container"><div className="loading-state">Loading your wishlist...</div></main>;
  }

  return (
    <main className="wishlist-container">
      <h1 className="page-title">My Wishlist</h1>

      {wishlistItems.length === 0 ? (
        <div className="empty-wishlist">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <h2>Love It? Add To My Wishlist</h2>
          <p>You haven't saved any items yet. Start shopping and add your favorite JAMBA WEAR items here.</p>
          <Link to="/" className="shop-now-btn">Continue Shopping</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlistItems.map((item) => {
            const isOOS = item.isOutOfStock === true;
            const itemImage = item.images?.[0] || "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png";

            return (
              <div key={item.id} className="wishlist-card">
                <div className={`wishlist-img-wrapper ${isOOS ? 'oos-dim' : ''}`}>
                  {isOOS && <span className="oos-badge">Out of Stock</span>}
                  
                  {/* WRAPPED IMAGE IN A LINK */}
                  <Link to={`/product/${item.id}`} style={{ display: 'block', height: '100%' }}>
                    <img src={itemImage} alt={item.title} className="wishlist-img" />
                  </Link>

                  <button 
                    className="remove-btn" 
                    onClick={(e) => {
                      e.preventDefault(); // Prevents the link from triggering when clicking 'X'
                      removeFromWishlist(item.id);
                    }}
                    title="Remove from Wishlist"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="wishlist-info">
                  {/* WRAPPED TITLE IN A LINK */}
                  <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 className="wishlist-title" style={{ cursor: 'pointer' }}>{item.title}</h3>
                  </Link>

                  <p className="wishlist-price">₹{item.selling_price?.toLocaleString('en-IN')}</p>
                  <button 
                    className={`move-to-cart-btn ${isOOS ? 'disabled-btn' : ''}`}
                    onClick={() => moveToCart(item)}
                    disabled={isOOS}
                  >
                    {isOOS ? 'Unavailable' : 'Move to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}