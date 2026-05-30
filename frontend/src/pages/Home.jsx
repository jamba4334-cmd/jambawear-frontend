import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

  // State for products
  const [womenProducts, setWomenProducts] = useState([]);
  const [menProducts, setMenProducts] = useState([]);
  const [accProducts, setAccProducts] = useState([]);
  
  // State for Video Banners
  const [heroVideos, setHeroVideos] = useState({
    women: "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/Video/Women.mp4",
    men: "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/Video/Men.mp4"
  });

  // Fetch Products & Settings from Firebase
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Storefront Products
        const querySnapshot = await getDocs(collection(db, "products"));
        const women = [];
        const men = [];
        const acc = [];

        querySnapshot.forEach((docSnap) => {
          const product = { id: docSnap.id, ...docSnap.data() };
          if (product.isHidden) return; // Skip hidden products

          const placement = (product.placement || "regular").toLowerCase();
          const category = (product.category || "").toLowerCase();

          // Only show "hero" placement items on the homepage
          if (placement === "hero") {
            if (category.includes('women') && women.length < 4) women.push(product);
            else if (category.includes('men') && !category.includes('women') && men.length < 4) men.push(product);
            else if (category.includes('accessories') && acc.length < 4) acc.push(product);
          }
        });

        setWomenProducts(women);
        setMenProducts(men);
        setAccProducts(acc);

        // 2. Fetch Video Settings
        const settingsRef = doc(db, "settings", "hero_banners");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setHeroVideos(prev => ({
            women: data.women_video || prev.women,
            men: data.men_video || prev.men
          }));
        }
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    }
    fetchData();
  }, []);

  // Reusable Product Card Component
  const ProductCard = ({ product }) => {
    const price = product.selling_price || product.price || 0;
    const originalPrice = product.original_price || price;
    const imgUrl = (product.images && product.images.length > 0) ? product.images[0] : (product.image || "https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png");
    const isOOS = product.isOutOfStock;

    return (
      <div className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
        {isOOS && <div className="oos-badge">Out of Stock</div>}
        <img className="product-image" src={imgUrl} alt={product.title} style={{ opacity: isOOS ? 0.5 : 1 }} />
        <div className="product-info">
          <h3 className="product-title">{product.title || "Unnamed Product"}</h3>
          <p className="product-price">
            ₹{price.toLocaleString('en-IN')}
            {originalPrice > price && (
              <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '11px', marginLeft: '5px' }}>
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="home-container">
      {/* 🚨 THE SECOND PROMO BANNER HAS BEEN REMOVED FROM HERE 🚨 */}

      <div className="category-scroll">
        <span className="chip active">All</span>
        <span className="chip" onClick={() => navigate('/category/men')}>Men's</span>
        <span className="chip" onClick={() => navigate('/category/women')}>Women's</span>
        <span className="chip" onClick={() => navigate('/category/accessories')}>Accessories</span>
        <span className="chip" onClick={() => navigate('/category/men')}>Waistcoats</span>
        <span className="chip" onClick={() => navigate('/category/women')}>Dokhona</span>
      </div>

      <section className="hero">
        <div className="hero-banner">
          <video autoPlay loop muted playsInline src={heroVideos.women}></video>
          <button className="shop-btn" onClick={() => navigate('/category/women')}>Shop Women</button>
        </div>
        <div className="hero-banner">
          <video autoPlay loop muted playsInline src={heroVideos.men}></video>
          <button className="shop-btn" onClick={() => navigate('/category/men')}>Shop Men</button>
        </div>
      </section>

      {/* Women's Collection */}
      <div className="section-header">
        <h2 className="section-title">Women's Collection</h2>
        <span className="view-all" onClick={() => navigate('/category/women')}>View All</span>
      </div>
      <section className="product-grid">
        {womenProducts.length > 0 ? (
          womenProducts.map(p => <ProductCard key={p.id} product={p} />)
        ) : (
          <p style={{ padding: '15px', color: 'var(--text-light)', gridColumn: '1 / -1' }}>Select "Homepage Hero" in Admin to display items here.</p>
        )}
      </section>

      {/* Men's Collection */}
      <div className="section-header">
        <h2 className="section-title">Men's Collection</h2>
        <span className="view-all" onClick={() => navigate('/category/men')}>View All</span>
      </div>
      <section className="product-grid">
        {menProducts.length > 0 ? (
          menProducts.map(p => <ProductCard key={p.id} product={p} />)
        ) : (
          <p style={{ padding: '15px', color: 'var(--text-light)', gridColumn: '1 / -1' }}>Select "Homepage Hero" in Admin to display items here.</p>
        )}
      </section>

      {/* Accessories */}
      <div className="section-header">
        <h2 className="section-title">Accessories</h2>
        <span className="view-all" onClick={() => navigate('/category/accessories')}>View All</span>
      </div>
      <section className="product-grid">
        {accProducts.length > 0 ? (
          accProducts.map(p => <ProductCard key={p.id} product={p} />)
        ) : (
          <p style={{ padding: '15px', color: 'var(--text-light)', gridColumn: '1 / -1' }}>Select "Homepage Hero" in Admin to display items here.</p>
        )}
      </section>
    </div>
  );
}