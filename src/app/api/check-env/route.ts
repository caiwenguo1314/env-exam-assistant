import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // u68c0u67e5u73afu5883u53d8u91cf
    const envVars = {
      GEMINI_API_URL: process.env.GEMINI_API_URL ? 'u5df2u8bbeu7f6e' : 'u672au8bbeu7f6e',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'u5df2u8bbeu7f6e' : 'u672au8bbeu7f6e',
      DATABASE_URL: process.env.DATABASE_URL ? 'u5df2u8bbeu7f6e' : 'u672au8bbeu7f6e',
    };

    return NextResponse.json({
      status: 'success',
      message: 'u73afu5883u53d8u91cfu68c0u67e5',
      data: envVars,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'u68c0u67e5u73afu5883u53d8u91cfu65f6u51fau9519', 
        error: error instanceof Error ? error.message : 'u672au77e5u9519u8bef' 
      },
      { status: 500 }
    );
  }
}
