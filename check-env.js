// u68c0u67e5u73afu5883u53d8u91cfu7684u7b80u5355u811au672c
require('dotenv').config();

console.log('=== u73afu5883u53d8u91cfu68c0u67e5 ===');
console.log('GEMINI_API_URL:', process.env.GEMINI_API_URL || 'u672au8bbeu7f6e');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `u5b58u5728 (u957fu5ea6: ${process.env.GEMINI_API_KEY.length})` : 'u672au8bbeu7f6e');
console.log('NODE_ENV:', process.env.NODE_ENV || 'u672au8bbeu7f6e');
console.log('======================');
