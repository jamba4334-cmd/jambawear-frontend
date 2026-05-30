// src/apiConfig.js

// Set this to true when deploying/using Render, set to false for localhost testing
const IS_PRODUCTION = true; 

export const API_BASE_URL = IS_PRODUCTION 
  ? "https://jamba-backend.onrender.com" 
  : "http://localhost:10000";