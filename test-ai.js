const axios = require('axios');

// 测试文本
const testText = `1. 下列有机废气中，可以采用水洗工艺高效率去除的是（）。
A. 甲苯
B. 乙醇
C. 乙烯
D. 丙烯腈

2. 关于大气污染物的说法，错误的是（）。
A. 大气污染物可分为一次污染物和二次污染物
B. 大气污染物可分为气态污染物和固态污染物
C. 大气污染物可分为常规污染物和特殊污染物
D. 大气污染物可分为有机污染物和无机污染物`;

async function testAIService() {
  try {
    console.log('发送请求到 AI 服务...');
    console.log('测试文本:', testText);
    
    const response = await axios.post('http://localhost:3000/api/test-ai-service', {
      text: testText
    });
    
    console.log('\n响应状态:', response.status);
    console.log('\n响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('测试失败:', error.response ? error.response.data : error.message);
  }
}

// 执行测试
testAIService();
