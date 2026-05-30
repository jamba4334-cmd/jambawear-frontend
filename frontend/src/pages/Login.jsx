import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [view, setView] = useState('login'); // 'login', 'otp', 'profile'
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState(new Array(6).fill('')); // Segmented OTP state
  const [confirmation, setConfirmation] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const otpRefs = useRef([]); // Refs for auto-advancing OTP inputs

  // Safely initialize reCAPTCHA
  useEffect(() => {
    if (view === 'login' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { /* reCAPTCHA solved */ }
      });
    }
  }, [view]);

  // --- DATABASE CHECK ---
  const checkExistingUser = async (user) => {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().name) {
        navigate('/');
      } else {
        if (user.displayName) {
          setProfile(prev => ({ ...prev, name: user.displayName, email: user.email || '' }));
        }
        setView('profile');
      }
    } catch (err) {
      console.error("Database Error:", err);
      navigate('/'); 
    }
  };

  // --- AUTH METHODS ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      await checkExistingUser(res.user);
    } catch (err) { 
      setError(err.message); 
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    // Basic regex for valid Indian phone numbers with country code
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setError("Enter a valid 10-digit Indian number starting with +91");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirm = await signInWithPhoneNumber(auth, phone.replace(/\s/g, ''), appVerifier);
      setConfirmation(confirm);
      setView('otp');
    } catch (err) { 
      setError("Failed to send OTP. Too many attempts or invalid number."); 
      console.error("OTP Error:", err);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await confirmation.confirm(otpString);
      await checkExistingUser(res.user);
    } catch (err) { 
      setError("Invalid OTP Code. Please try again."); 
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Name and Email are required.");
      return;
    }
    if (!emailRegex.test(profile.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, "users", user.uid), { 
        name: profile.name.trim(), 
        email: profile.email.trim(), 
        phone 
      }, { merge: true });
      navigate('/');
    } catch (err) {
      setError("Failed to save profile securely.");
      setLoading(false);
    }
  };

  // --- OTP INPUT HANDLERS ---
  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto-focus next input
    if (element.value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpBackspace = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(isNaN)) return; // Reject if it contains letters

    const newOtp = [...otp];
    pastedData.forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    
    // Focus last filled input
    const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
    otpRefs.current[focusIndex].focus();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <img 
          src="https://raw.githubusercontent.com/jamba4334-cmd/JAMBA/main/assets/JAMBA.png" 
          alt="JAMBA WEAR" 
          className="login-brand-logo"
        />

        {/* Accessibility: Screen readers will announce errors instantly */}
        {error && <div className="error-message" role="alert" aria-live="assertive">{error}</div>}

        {/* --- VIEW 1: LOGIN --- */}
        {view === 'login' && (
          <>
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Access your orders, address, and wishlist.</p>

            <button className="btn-google" onClick={handleGoogleLogin} disabled={loading} aria-label="Sign in with Google">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" aria-hidden="true" />
              {loading ? "Connecting..." : "Continue with Google"}
            </button>
            
            <div className="divider" aria-hidden="true"><span>OR PHONE NUMBER</span></div>
            
            <div className="input-group">
              <label htmlFor="phoneInput">Mobile Number</label>
              <input 
                id="phoneInput"
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+91 9876543210"
                disabled={loading}
                aria-invalid={!!error}
              />
            </div>
            
            <div id="recaptcha-container"></div>
            
            <button className="login-btn" onClick={handleSendOTP} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}
        
        {/* --- VIEW 2: OTP VERIFICATION --- */}
        {view === 'otp' && (
          <>
            <h2 className="login-title">Verify Phone</h2>
            <p className="login-subtitle">We sent a 6-digit code to <strong>{phone}</strong></p>
            
            {/* Enterprise Segmented OTP Input */}
            <div className="otp-group" onPaste={handleOtpPaste}>
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={data}
                  ref={(el) => otpRefs.current[index] = el}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) => handleOtpBackspace(e, index)}
                  disabled={loading}
                  className="otp-input"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>
            
            <button className="login-btn" onClick={verifyOTP} disabled={loading || otp.join('').length !== 6}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            
            <div className="toggle-mode">
              <span 
                onClick={() => {setView('login'); setOtp(new Array(6).fill('')); setError('');}} 
                className="toggle-link"
                role="button"
                tabIndex="0"
              >
                Change Phone Number
              </span>
            </div>
          </>
        )}

        {/* --- VIEW 3: COMPLETE PROFILE --- */}
        {view === 'profile' && (
          <>
            <h2 className="login-title">Welcome to JAMBA!</h2>
            <p className="login-subtitle">Let's finish setting up your account.</p>
            
            <div className="input-group">
              <label htmlFor="nameInput">Full Name</label>
              <input 
                id="nameInput"
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})} 
                placeholder="e.g. Rahul Boro" 
                disabled={loading}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="emailInput">Email Address</label>
              <input 
                id="emailInput"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})} 
                placeholder="you@example.com" 
                disabled={loading}
              />
            </div>
            
            <button className="login-btn" onClick={saveProfile} disabled={loading}>
              {loading ? "Saving..." : "Save & Enter Store"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}