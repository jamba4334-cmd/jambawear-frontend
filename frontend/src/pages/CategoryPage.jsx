import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './CategoryPage.css'; // You'll create this CSS next

export default function CategoryPage() {
  const { category } = useParams(); // Gets 'men', 'women', or 'accessories' from the URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const filtered = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isHidden) return;
        
        // Logic to match the category from URL
        const cat = (data.category || "").toLowerCase();
        if (cat.includes(category.toLowerCase())) {
          filtered.push({ id: data.item_id || doc.id, ...data });
        }
      });
      setProducts(filtered);
      setLoading(false);
    }
    fetchProducts();
  }, [category]);

  if (loading) return <div className="loading">Loading Collection...</div>;

  return (
    <div className="category-page">
      <div className="category-header">
        <h1 className="category-title">{category} Collection</h1>
      </div>
      <div className="product-grid">
        {products.map(product => (
          <div key={product.id} className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
            {product.isOutOfStock && <div className="oos-badge">Out of Stock</div>}
            <img src={product.images?.[0]} alt={product.title} className="product-image" />
            <div className="product-info">
              <h3 className="product-title">{product.title}</h3>
              <p className="product-price">₹{product.selling_price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}