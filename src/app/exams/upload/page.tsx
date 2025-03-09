'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/features/pdf-upload/file-upload';

export default function UploadExamPage() {
  const [uploadResult, setUploadResult] = useState<{
    examId: number;
    filePath: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    examId: number;
    questionCount: number;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const router = useRouter();

  const handleUploadComplete = (result: { examId: number; filePath: string }) => {
    setUploadResult(result);
    setError(null);
  };

  const handleUploadError = (error: Error) => {
    setError(error.message);
    setUploadResult(null);
  };

  const handleStartParsing = async () => {
    if (!uploadResult) return;
    
    setParsing(true);
    setParseError(null);
    
    try {
      const response = await fetch(`/api/exams/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examId: uploadResult.examId,
          filePath: uploadResult.filePath, // 这里使用API返回的完整文件路径
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '解析失败');
      }
      
      setParseResult({
        examId: data.examId,
        questionCount: data.questionCount,
      });
      
      // 2秒后跳转到考试页面
      setTimeout(() => {
        router.push(`/exams/${data.examId}`);
      }, 2000);
      
    } catch (error) {
      console.error('解析异常:', error);
      setParseError(error instanceof Error ? error.message : '未知异常');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">上传考试 PDF</h1>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">上传 PDF 文件</h2>
          <p className="text-gray-600 mb-4">
            上传包含考试题目的 PDF 文件，系统将自动提取题目内容。
          </p>
          
          <FileUpload 
            onUploadComplete={handleUploadComplete} 
            onUploadError={handleUploadError} 
          />
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            <p className="font-medium">上传失败</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {uploadResult && !parseResult && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="font-medium">上传成功！</p>
            <p className="text-sm">
              文件已上传，试卷 ID: {uploadResult.examId}
            </p>
            <button
              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleStartParsing}
              disabled={parsing}
            >
              {parsing ? (
                <>
                  <span className="inline-block h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                  正在解析...
                </>
              ) : (
                '开始解析题目'
              )}
            </button>
          </div>
        )}
        
        {parseError && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            <p className="font-medium">解析失败</p>
            <p className="text-sm">{parseError}</p>
            <button
              className="mt-2 px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              onClick={handleStartParsing}
            >
              重试解析
            </button>
          </div>
        )}
        
        {parseResult && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="font-medium">解析成功！</p>
            <p className="text-sm">
              共解析出 {parseResult.questionCount} 道题目。正在跳转到考试页面...
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