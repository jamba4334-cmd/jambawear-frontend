import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import Cart from './pages/Cart';
import Login from './pages/Login'; 
import Address from './pages/Address';
import ProductView from './pages/ProductView';
import Terms from './pages/terms';
import Privacy from './pages/Privacy';
import Shipping from './pages/Shipping';
import Refunds from './pages/Refunds';
import Contact from './pages/Contact';
import Orders from './pages/Orders';
// Import the new Wishlist page!
import Wishlist from './pages/Wishlist'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="category/:category" element={<CategoryPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} /> 
          <Route path="address" element={<Address />} />
          <Route path="product/:id" element={<ProductView />} />
          
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="contact" element={<Contact />} />
          
          {/* User Account Routes */}
          <Route path="orders" element={<Orders />} />
          <Route path="wishlist" element={<Wishlist />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;