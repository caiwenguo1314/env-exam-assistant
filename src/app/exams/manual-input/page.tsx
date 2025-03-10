'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ManualInputPage() {
  const router = useRouter();
  const [examId, setExamId] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!examId || !jsonData) {
      setMessage('请填写考试ID和JSON数据');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('');

      // 尝试解析JSON
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        setMessage('JSON格式不正确');
        setIsLoading(false);
        return;
      }

      // 调用API保存数据
      const response = await fetch('/api/exams/manual-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: parseInt(examId),
          questions: parsedData,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`成功保存${result.savedCount}个题目到数据库`);
        // 可选：保存成功后跳转
        setTimeout(() => {
          router.push(`/exams/${examId}`);
        }, 2000);
      } else {
        setMessage(`保存失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <Link href="/exams" className="text-primary-600 hover:text-primary-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回考试列表
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">手动输入题目数据</h1>

      {message && (
        <div className={`p-3 rounded mb-4 ${message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          考试ID <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="输入考试ID"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          题目数据 (JSON格式) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded min-h-[300px] font-mono"
          placeholder='[
  {
    "type": "选择题",
    "content": "题目内容",
    "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"],
    "answer": "A",
    "explanation": "解析内容"
  }
]'
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full py-2 rounded-md font-medium ${
          isLoading ? 'bg-gray-300 text-gray-500' : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {isLoading ? '保存中...' : '保存到数据库'}
      </button>
    </main>
  );
}
