'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function ParseExamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examId = params.examId as string;
  const filePath = searchParams.get('filePath');
  
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    questionCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseFile = async () => {
      if (!filePath) {
        setError('文件路径不存在');
        return;
      }

      setIsParsing(true);
      setError(null);

      try {
        const response = await fetch('/api/exams/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            examId,
            filePath,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '解析失败');
        }

        const data = await response.json();
        setParseResult(data);
        
        // 解析成功后跳转到考试页面
        setTimeout(() => {
          router.push(`/exams/${examId}`);
        }, 2000);
      } catch (error) {
        console.error('解析错误:', error);
        setError(error instanceof Error ? error.message : '未知错误');
      } finally {
        setIsParsing(false);
      }
    };

    parseFile();
  }, [examId, filePath, router]);

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">解析 PDF 文件</h1>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">正在处理文件</h2>
          <p className="text-gray-600 mb-4">
            系统正在解析 PDF 文件中的题目，请稍候...
          </p>
          
          {isParsing && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">正在解析文件，这可能需要几分钟时间...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            <p className="font-medium">解析失败</p>
            <p className="text-sm">{error}</p>
            <button
              className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              onClick={() => router.push('/exams/upload')}
            >
              返回上传页面
            </button>
          </div>
        )}

        {parseResult && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="font-medium">解析成功！</p>
            <p className="text-sm">
              成功解析 {parseResult.questionCount} 道题目。正在跳转到考试页面...
            </p>
            <div className="mt-2 w-full bg-green-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}