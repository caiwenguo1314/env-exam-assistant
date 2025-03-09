'use client';

import { useState, useEffect } from 'react';
import { decodeUnicodeEscapes, ensureChineseDisplay } from '@/lib/utils/decode-unicode';

export default function TestDecodePage() {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/test-decode');
        const data = await response.json();
        setTestData(data);
      } catch (err) {
        setError('获取数据失败: ' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function decodeText(text: string) {
    try {
      return ensureChineseDisplay(text);
    } catch (err) {
      return '解码失败: ' + (err instanceof Error ? err.message : '未知错误');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">测试解码功能</h1>
      
      {loading && <p className="text-gray-500">加载中...</p>}
      
      {error && <p className="text-red-500">{error}</p>}
      
      {testData && (
        <div className="space-y-6">
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">原始数据</h2>
            <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-gray-100 p-2 rounded">
              {JSON.stringify(testData.original, null, 2)}
            </pre>
          </div>
          
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">JSON 字符串</h2>
            <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-gray-100 p-2 rounded">
              {testData.jsonString}
            </pre>
          </div>
          
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">解码后的数据</h2>
            <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-gray-100 p-2 rounded">
              {JSON.stringify(testData.decoded, null, 2)}
            </pre>
          </div>
          
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">手动解码测试</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">原始文本</h3>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-gray-100 p-2 rounded">
                  {testData.jsonString.substring(0, 200)}...
                </pre>
              </div>
              <div>
                <h3 className="font-medium mb-2">解码后的文本</h3>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-gray-100 p-2 rounded">
                  {decodeText(testData.jsonString.substring(0, 200))}...
                </pre>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 border rounded bg-blue-50">
            <h2 className="text-xl font-semibold mb-4">测试题目展示</h2>
            {testData.decoded.questions.map((question: any, index: number) => (
              <div key={index} className="mb-6 p-4 border rounded bg-white">
                <h3 className="font-medium text-lg">
                  {index + 1}. {question.type}: {question.content}
                </h3>
                <div className="ml-4 mt-2">
                  {question.options && question.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="my-1">
                      {option}
                    </div>
                  ))}
                  <div className="mt-2 font-medium text-green-600">
                    正确答案: {question.answer}
                  </div>
                  {question.explanation && (
                    <div className="mt-2 text-gray-700">
                      解析: {question.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
