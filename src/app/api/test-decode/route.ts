import { NextResponse } from 'next/server';
import { decodeObjectStrings } from '@/lib/utils/decode-unicode';

/**
 * 测试解码中文字符的 API 接口
 */
export async function GET() {
  try {
    // 创建一个包含中文字符的测试对象
    const testObject = {
      title: '环评师考试助手',
      description: '帮助环评师考试备考的工具',
      questions: [
        {
          type: '选择题',
          content: '下列关于环境影响评价制度的说法中，错误的是（ ）。',
          options: [
            'A. 环境影响评价是一种事前预防性的环境管理制度',
            'B. 环境影响评价是对规划和建设项目实施后可能造成的环境影响进行分析、预测和评价',
            'C. 环境影响评价制度是我国环境保护的基本制度',
            'D. 环境影响评价制度是在项目决策阶段中引入环境保护工作的有效措施'
          ],
          answer: 'B',
          explanation: '环境影响评价是对规划和建设项目实施前可能造成的环境影响进行分析、预测和评价，而不是实施后。'
        }
      ]
    };

    // 返回原始对象和 JSON 字符串
    const jsonString = JSON.stringify(testObject);
    
    return NextResponse.json({
      success: true,
      original: testObject,
      jsonString: jsonString,
      decoded: decodeObjectStrings(JSON.parse(jsonString))
    });
  } catch (error) {
    console.error('测试解码失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
