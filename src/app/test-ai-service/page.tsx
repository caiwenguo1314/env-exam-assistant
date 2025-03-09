"use client";

import { useState } from 'react';

export default function TestAIService() {
  const [inputText, setInputText] = useState(
    `1. 下列有机废气中，可以采用水洗工艺高效率去除的是（）。
A. 甲苯
B. 乙醇
C. 乙烯
D. 丙烯腈

2. 关于大气污染物的说法，错误的是（）。
A. 大气污染物可分为一次污染物和二次污染物
B. 大气污染物可分为气态污染物和固态污染物
C. 大气污染物可分为常规污染物和特殊污染物
D. 大气污染物可分为有机污染物和无机污染物`
  );
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('请输入测试文本');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-ai-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI 服务测试</h1>
      
      <div className="mb-4 border rounded p-4">
        <h2 className="text-xl mb-2">输入测试文本</h2>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="请输入要测试的文本..."
          rows={10}
          className="w-full border p-2 mb-4"
        />
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? '处理中...' : '提交测试'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="border rounded p-4">
          <h2 className="text-xl mb-2">测试结果</h2>
          <div className="mb-4">
            <h3 className="font-bold">提取的题目数量: {result.questionCount}</h3>
          </div>
          
          <hr className="my-4" />
          
          <div className="space-y-4">
            {result.questions && result.questions.map((question: any, index: number) => (
              <div key={index} className="border p-4 rounded">
                <p className="font-bold mb-2">题目 {index + 1} ({question.type})</p>
                <p className="mb-2">{question.content}</p>
                
                {question.options && question.options.length > 0 && (
                  <div className="mb-2">
                    <p className="font-semibold">选项:</p>
                    <ul className="list-disc pl-5">
                      {question.options.map((option: string, optIndex: number) => (
                        <li key={optIndex}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {question.answer && (
                  <div className="mb-2">
                    <p className="font-semibold">答案:</p>
                    <p>{question.answer}</p>
                  </div>
                )}
                
                {question.explanation && (
                  <div>
                    <p className="font-semibold">解析:</p>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
