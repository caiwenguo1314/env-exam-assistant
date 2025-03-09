import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    // u83b7u53d6u73afu5883u53d8u91cf
    const API_URL = process.env.GEMINI_API_URL;
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_URL || !API_KEY) {
      return NextResponse.json({
        error: 'u7f3au5c11 API u914du7f6e',
        apiUrl: API_URL ? 'u5df2u8bbeu7f6e' : 'u672au8bbeu7f6e',
        apiKey: API_KEY ? 'u5df2u8bbeu7f6e' : 'u672au8bbeu7f6e'
      }, { status: 400 });
    }
    
    // u51c6u5907u8bf7u6c42u6570u636e
    const requestData = {
      model: "gemini-pro",
      messages: [
        { role: "user", content: "u8bf7u56deu7b54u4e00u4e2au7b80u5355u7684u95eeu9898uff1au4ec0u4e48u662fu73afu8bc4u5e08uff1f" }
      ],
      temperature: 0.3,
      max_tokens: 100
    };
    
    // u53d1u9001u8bf7u6c42
    const response = await axios.post(API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 10000 // 10u79d2u8d85u65f6
    });
    
    // u8fd4u56deu7ed3u679c
    return NextResponse.json({
      success: true,
      data: response.data,
      responseStructure: Object.keys(response.data)
    });
  } catch (error) {
    console.error('u6d4bu8bd5 Gemini API u9519u8bef:', error);
    
    // u5904u7406u9519u8bef
    let errorMessage = 'u672au77e5u9519u8bef';
    let statusCode = 500;
    let errorDetails = {};
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // u670du52a1u5668u8fd4u56deu4e86u9519u8befu54cdu5e94
        errorMessage = `u670du52a1u5668u9519u8bef: ${error.response.status}`;
        statusCode = error.response.status;
        errorDetails = {
          data: error.response.data,
          headers: error.response.headers
        };
      } else if (error.request) {
        // u8bf7u6c42u5df2u53d1u9001u4f46u6ca1u6709u6536u5230u54cdu5e94
        errorMessage = 'u672au6536u5230u54cdu5e94';
        errorDetails = { request: error.request };
      } else {
        // u8bbeu7f6eu8bf7u6c42u65f6u53d1u751fu9519u8bef
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: statusCode });
  }
}
