// 测试 Gemini API 的脚本
require('dotenv').config();
const axios = require('axios');

async function testGeminiAPI() {
  try {
    // 获取环境变量
    const API_URL = process.env.GEMINI_API_URL;
    const API_KEY = process.env.GEMINI_API_KEY;
    
    console.log('=== Gemini API 测试 ===');
    console.log('API URL:', API_URL);
    console.log('API KEY 长度:', API_KEY ? API_KEY.length : '未设置');
    
    if (!API_URL || !API_KEY) {
      console.error('错误: 缺少 API 配置');
      return;
    }
    
    // 准备请求数据
    const requestData = {
      model: "gemini-2.0-flash-exp",
      messages: [
        { role: "user", content: "请回答一个简单的问题：什么是环评师？" }
      ],
      temperature: 0.3,
      max_tokens: 100
    };
    
    console.log('\n发送请求到 Gemini API...');
    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    
    // 发送请求
    const response = await axios.post(API_URL, requestData, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 10000 // 10秒超时
    });
    
    console.log('\n请求成功！');
    console.log('响应状态:', response.status);
    console.log('响应数据结构:', Object.keys(response.data));
    
    // 尝试解析响应
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      // OpenAI 格式
      console.log('\n使用 OpenAI 格式解析响应:');
      console.log(response.data.choices[0].message.content);
    } else if (response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
      // Gemini 格式
      console.log('\n使用 Gemini 格式解析响应:');
      console.log(response.data.candidates[0].content.parts[0].text);
    } else {
      // 直接输出原始响应
      console.log('\n无法识别的响应格式，原始响应:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n测试 Gemini API 错误:');
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // 服务器返回了错误响应
        console.error('服务器错误:', error.response.status);
        console.error('错误数据:', error.response.data);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('未收到响应');
      } else {
        // 设置请求时发生错误
        console.error('请求错误:', error.message);
      }
    } else {
      console.error(error);
    }
  }
}

// 执行测试
testGeminiAPI();
