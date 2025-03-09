// 测试 API 响应格式的脚本
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function testApiResponse() {
  try {
    // 获取环境变量
    const API_URL = process.env.GEMINI_API_URL;
    const API_KEY = process.env.GEMINI_API_KEY;
    
    console.log('=== API 响应格式测试 ===');
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
    
    console.log('\n发送请求到 API...');
    
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
    
    // 保存完整响应到文件以便分析
    fs.writeFileSync('api-response.json', JSON.stringify(response.data, null, 2));
    console.log('\n完整响应已保存到 api-response.json 文件');
    
    // 分析响应格式
    console.log('\n分析响应格式:');
    
    if (response.data.choices && response.data.choices[0]) {
      console.log('检测到 OpenAI 格式响应');
      console.log('choices[0] 结构:', Object.keys(response.data.choices[0]));
      
      if (response.data.choices[0].message) {
        console.log('message 结构:', Object.keys(response.data.choices[0].message));
        console.log('\n内容示例:');
        console.log(response.data.choices[0].message.content.substring(0, 200) + '...');
      }
    } 
    
    if (response.data.candidates && response.data.candidates[0]) {
      console.log('检测到 Gemini 格式响应');
      console.log('candidates[0] 结构:', Object.keys(response.data.candidates[0]));
      
      if (response.data.candidates[0].content) {
        console.log('content 结构:', Object.keys(response.data.candidates[0].content));
        
        if (response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0]) {
          console.log('\n内容示例:');
          console.log(response.data.candidates[0].content.parts[0].text.substring(0, 200) + '...');
        }
      }
    }
    
  } catch (error) {
    console.error('\n测试 API 错误:');
    
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
testApiResponse();
