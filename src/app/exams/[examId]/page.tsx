'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeUnicodeEscapes, formatDateTime } from '@/lib/utils';

type Question = {
  id: number;
  content: string;
  type: string;
  options: string;
  answer: string;
  explanation: string;
  tags?: string;
};

type Exam = {
  id: number;
  title: string;
  createdAt: string;
  questions: Question[];
  categorySummary?: Array<{category: string, count: number}>;
  questionsByCategory?: Record<string, Question[]>;
};

export default function ExamDetailPage({ params }: { params: { examId: string } }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { examId } = params;

  useEffect(() => {
    async function fetchExamDetail() {
      try {
        const response = await fetch(`/api/exams/${examId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch exam details');
        }
        const data = await response.json();
        
        // 处理可能的乱码问题
        if (data.questions && Array.isArray(data.questions)) {
          data.questions = data.questions.map(q => ({
            ...q,
            content: decodeUnicodeEscapes(q.content),
            explanation: decodeUnicodeEscapes(q.explanation || ''),
          }));
        }
        
        setExam(data);
      } catch (error) {
        console.error('Error fetching exam details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExamDetail();
  }, [examId]);

  function formatOptions(optionsStr: string) {
    try {
      // 处理选项中可能的乱码
      const decodedOptionsStr = decodeUnicodeEscapes(optionsStr);
      const options = JSON.parse(decodedOptionsStr);
      if (Array.isArray(options)) {
        return options.map((option, index) => (
          <div key={index} className="mb-1">
            <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
            {option}
          </div>
        ));
      }
      return <div>{decodedOptionsStr}</div>;
    } catch (e) {
      return <div>{decodeUnicodeEscapes(optionsStr)}</div>;
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : !exam ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">未找到考试信息</p>
            <Link 
              href="/exams"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              返回考试列表
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">{exam.title || `考试 ${exam.id}`}</h1>
              <div className="flex space-x-4">
                <Link 
                  href={`/exams/${examId}/practice`}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  开始练习
                </Link>
                <Link 
                  href="/exams"
                  className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  返回列表
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">考试信息</h2>
                <span className="text-sm text-gray-500">
                  创建时间: {formatDateTime(exam.createdAt)}
                </span>
              </div>
              <div className="text-gray-600">
                <p>题目数量: {exam.questions.length}</p>
                {exam.categorySummary && exam.categorySummary.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1">题目分类:</p>
                    <div className="flex flex-wrap gap-2">
                      {exam.categorySummary.map((item) => (
                        <span key={item.category} className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                          {item.category}: {item.count}题
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 按分类显示题目 */}
            {exam.questionsByCategory ? (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">按分类浏览题目</h2>
                
                {Object.keys(exam.questionsByCategory).length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600">暂无题目</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(exam.questionsByCategory).map(([category, questions]) => (
                      <div key={category} className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4 pb-2 border-b">{category} ({questions.length}题)</h3>
                        
                        <div className="space-y-6">
                          {questions.map((question, index) => (
                            <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-medium">
                                  <span className="mr-2">{index + 1}.</span>
                                  {question.content}
                                </h4>
                                <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
                                  {question.type}
                                </span>
                              </div>
                              
                              <div className="mb-4">
                                {formatOptions(question.options)}
                              </div>
                              
                              <div className="mb-2">
                                <span className="font-medium text-primary-600">答案: </span>
                                <span>{question.answer}</span>
                              </div>
                              
                              {question.explanation && (
                                <div className="text-gray-700 bg-gray-50 p-3 rounded">
                                  <span className="font-medium">解析: </span>
                                  <span>{question.explanation}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">题目列表</h2>
                
                {exam.questions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600">暂无题目</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {exam.questions.map((question, index) => (
                      <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-medium">
                            <span className="mr-2">{index + 1}.</span>
                            {question.content}
                          </h3>
                          <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
                            {question.type}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          {formatOptions(question.options)}
                        </div>
                        
                        <div className="mb-2">
                          <span className="font-medium text-primary-600">答案: </span>
                          <span>{question.answer}</span>
                        </div>
                        
                        {question.explanation && (
                          <div className="text-gray-700 bg-gray-50 p-3 rounded">
                            <span className="font-medium">解析: </span>
                            <span>{question.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
