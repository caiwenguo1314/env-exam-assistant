import { NextResponse } from 'next/server';

export async function GET() {
  // 获取环境变量（不返回实际值，只返回是否存在和长度）
  const apiUrl = process.env.GEMINI_API_URL;
  const apiKey = process.env.GEMINI_API_KEY;
  
  return NextResponse.json({
    geminiApiUrl: apiUrl ? `存在 (长度: ${apiUrl.length})` : '未设置',
    geminiApiKey: apiKey ? `存在 (长度: ${apiKey.length})` : '未设置',
    nodeEnv: process.env.NODE_ENV || '未设置',
  });
}
