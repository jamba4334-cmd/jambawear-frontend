import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Added setDoc, deleteDoc for Wishlist actions
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
// Added Firebase Auth to check login status
import { onAuthStateChanged } from 'firebase/auth';
// Imported auth along with db
import { db, auth } from '../firebase'; 
import './ProductView.css';

export default function ProductView() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [mainImage, setMainImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [addedToCart, setAddedToCart] = useState(false);

  // --- NEW WISHLIST STATE ---
  const [inWishlist, setInWishlist] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch Product Logic
  useEffect(() => {
    async function fetchProduct() {
      try {
        const q = query(collection(db, "products"), where("item_id", "==", id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          data.id = data.item_id || querySnapshot.docs[0].id;
          setProduct(data);
          setMainImage(data.images?.[0] || "https://via.placeholder.com/400x500");
          if (data.requires_size === false) setSelectedSize("One Size");
        } else {
          const docRef = doc(db, "products", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            data.id = docSnap.id;
            setProduct(data);
            setMainImage(data.images?.[0] || "https://via.placeholder.com/400x500");
            if (data.requires_size === false) setSelectedSize("One Size");
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // --- NEW WISHLIST EFFECT: Check if logged in & in wishlist ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && product) {
        const email = user.email || user.phoneNumber;
        checkWishlistStatus(email, product.id);
      }
    });
    return () => unsubscribe();
  }, [product]);

  const checkWishlistStatus = async (email, productId) => {
    try {
      const wishlistDocRef = doc(db, 'wishlists', `${email}_${productId}`);
      const docSnap = await getDoc(wishlistDocRef);
      if (docSnap.exists()) {
        setInWishlist(true);
      }
    } catch (err) {
      console.error("Error checking wishlist:", err);
    }
  };

  const toggleWishlist = async () => {
    if (!currentUser) {
      alert("Please log in to save items to your wishlist!");
      navigate(`/login?redirect=product/${product.id}`);
      return;
    }
    
    const email = currentUser.email || currentUser.phoneNumber;
    const wishlistDocRef = doc(db, 'wishlists', `${email}_${product.id}`);

    try {
      if (inWishlist) {
        // Remove from Firestore
        await deleteDoc(wishlistDocRef);
        setInWishlist(false);
      } else {
        // Add to Firestore
        await setDoc(wishlistDocRef, {
          customerEmail: email,
          productId: product.id,
          addedAt: new Date()
        });
        setInWishlist(true);
      }
    } catch (err) {
      console.error("Error updating wishlist:", err);
      alert("Failed to update wishlist. Please check your connection.");
    }
  };
  // ----------------------------------------------------

  const handleAddToCart = () => {
    let cart = JSON.parse(localStorage.getItem('jambaCart')) || [];
    const existingItem = cart.find(i => i.id === product.id && i.size === selectedSize);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.selling_price,
        image: mainImage,
        size: selectedSize,
        quantity: 1
      });
    }

    localStorage.setItem('jambaCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated')); 
    
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    const singleItemCart = [{
      id: product.id,
      title: product.title,
      price: product.selling_price,
      image: mainImage,
      size: selectedSize,
      quantity: 1
    }];
    localStorage.setItem('jambaCart', JSON.stringify(singleItemCart));
    navigate('/cart');
  };

  if (loading) return <div className="loading-state">Loading Product Details...</div>;
  if (error || !product) return (
    <div className="error-state">
      <h2>Item Not Found</h2>
      <p>The product you are looking for does not exist.</p>
      <button className="back-link" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const isOOS = product.isOutOfStock === true;
  
  let displayCategory = product.category || 'N/A';
  if (displayCategory.includes('-')) {
    const parts = displayCategory.split('-');
    displayCategory = `${parts[1]?.trim() || ''} ${parts[0]?.trim() || ''}`.trim();
  }

  return (
    <>
      <div className="back-nav">
        <span className="back-link" onClick={() => navigate(-1)}>← Back</span>
      </div>

      <div className="product-container">
        <div className="product-image-section">
          <div className={`product-image-box ${isOOS ? 'oos-dim' : ''}`}>
            <img src={mainImage} alt={product.title} />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="slider-thumbnails">
              {product.images.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  className={`slider-thumb ${mainImage === img ? 'active' : ''}`} 
                  onClick={() => setMainImage(img)} 
                  alt={`Thumbnail ${idx}`} 
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="product-details">
          {isOOS && <div className="oos-text-badge">Currently Out of Stock</div>}
          <p className="brand-name">{product.brandName || 'JAMBA WEAR'} | {product.sellerName || 'LUXURY ETHNIC'}</p>
          <h1 className="product-title">{product.title}</h1>
          
          <p className="product-price">
            ₹{product.selling_price}
            {product.original_price > product.selling_price && (
              <span className="old-price" style={{textDecoration: 'line-through', color: '#999', fontSize: '16px', marginLeft: '8px'}}>₹{product.original_price}</span>
            )}
          </p>
          
          <div className="divider"></div>
          <p className="product-desc">{product.description || 'No description available.'}</p>
          
          <div className="meta-details">
            <div className="meta-item"><strong>Color:</strong> {product.color || 'N/A'}</div>
            <div className="meta-item"><strong>Fabric:</strong> {product.fabric || 'N/A'}</div>
            <div className="meta-item"><strong>Category:</strong> {displayCategory}</div>
          </div>

          {product.requires_size !== false && (
            <div className="size-section">
              <span className="size-label">Select Size</span>
              <div className="size-options">
                {['S', 'M', 'L', 'XL'].map(size => (
                  <button 
                    key={size}
                    className={`size-btn ${selectedSize === size ? 'selected' : ''}`} 
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="btn-container">
            <button 
              className={`buy-now-btn ${isOOS ? 'disabled-btn' : ''}`} 
              onClick={handleBuyNow} 
              disabled={isOOS}
            >
              {isOOS ? 'Out of Stock' : 'Buy Now'}
            </button>
            
            {/* ADD TO CART & WISHLIST ROW */}
            <div className="cart-wishlist-row">
              <button 
                className={`add-to-cart-btn ${isOOS ? 'disabled-btn' : ''}`} 
                onClick={handleAddToCart} 
                disabled={isOOS}
                style={{ backgroundColor: addedToCart ? '#27ae60' : '' }}
              >
                {isOOS ? 'Out of Stock' : addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
              </button>

              <button 
                className="wishlist-toggle-btn" 
                onClick={toggleWishlist}
                title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                {inWishlist ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" color="#d9534f">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}