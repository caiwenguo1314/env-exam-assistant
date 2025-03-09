'use client';

import { useState } from 'react';
import { parseJsonWithChineseChars, decodeObjectStrings } from '@/lib/utils/decode-unicode';

export default function TestJsonParsePage() {
  const [jsonInput, setJsonInput] = useState<string>(
    '[{"type":"选择题","content":"下列关于环境影响评价制度的说法中，错误的是（ ）。","options":["A. 环境影响评价是一种事前预防性的环境管理制度","B. 环境影响评价是对规划和建设项目实施后可能造成的环境影响进行分析、预测和评价","C. 环境影响评价制度是我国环境保护的基本制度","D. 环境影响评价制度是在项目决策阶段中引入环境保护工作的有效措施"],"answer":"A","explanation":"解析：选项A错误，环境影响评价是一种事前预防性的环境管理制度，这个说法是正确的。"}]'
  );
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [decodedResult, setDecodedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParseJson = () => {
    try {
      setError(null);
      
      // 尝试解析 JSON
      const parsed = parseJsonWithChineseChars(jsonInput);
      setParsedResult(parsed);
      
      // 解码字符串
      const decoded = decodeObjectStrings(parsed);
      setDecodedResult(decoded);
    } catch (err) {
      setError(`解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setParsedResult(null);
      setDecodedResult(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">测试 JSON 解析</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          输入 JSON 字符串
        </label>
        <textarea
          className="w-full h-40 p-2 border rounded-md"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="输入 JSON 字符串..."
        />
      </div>

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-6"
        onClick={handleParseJson}
      >
        解析 JSON
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {parsedResult && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">解析结果</h2>
          <pre className="p-4 bg-gray-100 rounded-md overflow-auto">
            {JSON.stringify(parsedResult, null, 2)}
          </pre>
        </div>
      )}

      {decodedResult && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">解码后的结果</h2>
          <pre className="p-4 bg-gray-100 rounded-md overflow-auto">
            {JSON.stringify(decodedResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
