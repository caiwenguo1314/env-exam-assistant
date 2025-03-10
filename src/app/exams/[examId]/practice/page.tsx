'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeUnicode } from '@/lib/utils/decode-unicode';

// 题目接口
interface Question {
  id: number;
  content: string;
  type: string;
  options: string;
  answer: string;
  explanation: string;
  hasChart?: boolean;  // 是否含有图表
  externalId?: string; // 外部ID，用于答案匹配
}

// 考试接口
interface Exam {
  id: number;
  title: string;
  questions: Question[];
}

// 用户回答接口
interface UserAnswer {
  questionId: number;
  answer: string[];
  isCorrect: boolean;
}

// 练习模式类型
type PracticeMode = 'practice' | 'test';

export default function PracticePage({ params }: { params: Promise<{ examId: string }> }) {
  const router = useRouter();
  
  // 解决Next.js 15.2.1版本中的sync-dynamic-apis问题
  // 移除直接访问params对象内部属性的代码
  const [examId, setExamId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [exam, setExam] = useState<Exam | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [canNavigateFreely, setCanNavigateFreely] = useState<boolean>(false);
  const [practiceCompleted, setPracticeCompleted] = useState<boolean>(false);
  
  // 添加练习模式状态
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('practice');
  const [testCompleted, setTestCompleted] = useState<boolean>(false);

  const [showQuestionDropdown, setShowQuestionDropdown] = useState<boolean>(false);

  useEffect(() => {
    async function resolveParams() {
      try {
        // 解析params中的examId
        const resolvedParams = await params;
        setExamId(resolvedParams.examId);
      } catch (error) {
        console.error('无法解析路由参数:', error);
        setError('无法加载考试信息');
      }
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    async function fetchExamDetail() {
      if (!examId) return;

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
            content: decodeUnicode(q.content),
            explanation: decodeUnicode(q.explanation || ''),
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

  // 判断题目是否为多选题
  function isMultipleChoiceQuestion(questionType: string): boolean {
    return [
      '多选题', 
      '不定项', 
      '不定项选择题',
      '多项选择题'
    ].some(type => questionType.includes(type));
  }

  function parseOptions(optionsStr: string): string[] {
    try {
      // 处理选项中可能的乱码
      const decodedOptionsStr = decodeUnicode(optionsStr);
      const options = JSON.parse(decodedOptionsStr);
      if (Array.isArray(options)) {
        return options;
      }
      return [decodedOptionsStr];
    } catch (e) {
      return [decodeUnicode(optionsStr)];
    }
  }

  function handleOptionSelect(option: string, index: number) {
    if (!exam) return;
    
    const currentQuestion = exam.questions[currentQuestionIndex];
    const isMultiChoice = isMultipleChoiceQuestion(currentQuestion.type);
    const optionLetter = String.fromCharCode(65 + index);
    
    if (isMultiChoice) {
      // 多选题处理
      setSelectedOptions(prevOptions => {
        if (prevOptions.includes(optionLetter)) {
          // 如果已选，则取消选择
          return prevOptions.filter(opt => opt !== optionLetter);
        } else {
          // 否则添加选择
          return [...prevOptions, optionLetter].sort();
        }
      });
    } else {
      // 单选题处理
      setSelectedOption(optionLetter);
    }
  }

  function handleSubmitAnswer() {
    if (!exam) return;
    
    // 获取用户选择的答案
    let userAnswer: string[] = [];
    if (isMultipleChoiceQuestion(currentQuestion.type)) {
      userAnswer = [...selectedOptions].sort();
    } else {
      userAnswer = selectedOption ? [selectedOption] : [];
    }
    
    // 验证答案
    let isCorrect = false;
    if (isMultipleChoiceQuestion(currentQuestion.type)) {
      const correctAnswer = currentQuestion.answer.split('').sort().join('');
      const userAnswerStr = userAnswer.join('');
      isCorrect = correctAnswer === userAnswerStr;
    } else {
      isCorrect = userAnswer.length > 0 && userAnswer[0] === currentQuestion.answer;
    }
    
    // 记录用户回答
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      // 检查是否已回答过此题
      const existingAnswerIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
      
      const answerData: UserAnswer = {
        questionId: currentQuestion.id,
        answer: userAnswer,
        isCorrect,
      };
      
      if (existingAnswerIndex !== -1) {
        // 更新已有答案
        newAnswers[existingAnswerIndex] = answerData;
      } else {
        // 添加新答案
        newAnswers.push(answerData);
      }
      
      return newAnswers;
    });
    
    // 根据练习模式决定下一步操作
    if (practiceMode === 'practice') {
      // 练习模式：显示解析
      setShowExplanation(true);
    } else {
      // 测试模式：直接进入下一题
      if (currentQuestionIndex < exam.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption('');
        setSelectedOptions([]);
      } else {
        // 所有题目已完成
        setTestCompleted(true);
      }
    }
  }

  function handlePrevQuestion() {
    if (!exam || currentQuestionIndex <= 0) return;
    
    // 找出前面已回答的题目
    if (!canNavigateFreely) {
      // 如果不允许自由跳转，则只能跳转到之前做过的题目
      let prevAnsweredIndex = -1;
      
      // 从当前题目往前找，找到最近的一个已回答的题目
      for (let i = currentQuestionIndex - 1; i >= 0; i--) {
        const question = exam.questions[i];
        if (userAnswers.some(a => a.questionId === question.id)) {
          prevAnsweredIndex = i;
          break;
        }
      }
      
      // 如果没有找到已回答的题目，则不能跳转
      if (prevAnsweredIndex === -1) return;
      
      // 跳转到找到的已回答题目
      setCurrentQuestionIndex(prevAnsweredIndex);
    } else {
      // 允许自由跳转，直接跳到上一题
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
    
    setSelectedOption('');
    setSelectedOptions([]);
    setShowExplanation(false);
    
    // 恢复之前的选择（如果有）
    const prevQuestion = exam.questions[canNavigateFreely ? currentQuestionIndex - 1 : 
      userAnswers.findIndex(a => a.questionId === exam.questions[currentQuestionIndex - 1].id) !== -1 ? currentQuestionIndex - 1 : 
      userAnswers.map(a => exam.questions.findIndex(q => q.id === a.questionId)).filter(idx => idx < currentQuestionIndex).sort((a, b) => b - a)[0]];
    
    const prevAnswer = userAnswers.find(a => a.questionId === prevQuestion.id);
    
    if (prevAnswer) {
      // 显示已回答题目的解析
      setShowExplanation(true);
      
      // 恢复选择
      if (isMultipleChoiceQuestion(prevQuestion.type)) {
        setSelectedOptions([...prevAnswer.answer]);
      } else {
        setSelectedOption(prevAnswer.answer);
      }
    }
  }

  function handleNextQuestion() {
    if (!exam || currentQuestionIndex >= exam.questions.length - 1) return;
    
    // 如果不允许自由跳转，只能跳转到做过的题或当前题的下一题
    if (!canNavigateFreely) {
      // 当前题是否已回答
      const currentQuestion = exam.questions[currentQuestionIndex];
      const isCurrentAnswered = userAnswers.some(a => a.questionId === currentQuestion.id);
      
      // 如果当前题未回答且没有显示解析，则不允许跳转
      if (!isCurrentAnswered && !showExplanation) {
        return;
      }
      
      // 查找下一个已回答的题目
      let nextAnsweredIndex = -1;
      
      for (let i = currentQuestionIndex + 1; i < exam.questions.length; i++) {
        const question = exam.questions[i];
        if (userAnswers.some(a => a.questionId === question.id)) {
          nextAnsweredIndex = i;
          break;
        }
      }
      
      // 如果存在已回答的下一题，跳转到该题
      // 否则，如果当前题已回答，允许跳转到下一题
      if (nextAnsweredIndex !== -1) {
        setCurrentQuestionIndex(nextAnsweredIndex);
      } else if (isCurrentAnswered || showExplanation) {
        // 当前题已回答，可以跳到下一题
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // 不满足条件，不跳转
        return;
      }
    } else {
      // 允许自由跳转，直接跳到下一题
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
    
    setSelectedOption('');
    setSelectedOptions([]);
    setShowExplanation(false);
    
    // 恢复之前的选择（如果有）
    const nextIndex = canNavigateFreely ? currentQuestionIndex + 1 : 
                       userAnswers.findIndex(a => a.questionId === exam.questions[currentQuestionIndex + 1].id) !== -1 ? 
                       currentQuestionIndex + 1 : 
                       userAnswers.find(a => exam.questions.findIndex(q => q.id === a.questionId) > currentQuestionIndex) ?
                       exam.questions.findIndex(q => q.id === userAnswers.find(a => 
                         exam.questions.findIndex(q2 => q2.id === a.questionId) > currentQuestionIndex
                       )?.questionId) :
                       currentQuestionIndex + 1;
    
    if (nextIndex < exam.questions.length) {
      const nextQuestion = exam.questions[nextIndex];
      const nextAnswer = userAnswers.find(a => a.questionId === nextQuestion.id);
      
      if (nextAnswer) {
        // 显示已回答题目的解析
        setShowExplanation(true);
        
        // 恢复选择
        if (isMultipleChoiceQuestion(nextQuestion.type)) {
          setSelectedOptions([...nextAnswer.answer]);
        } else {
          setSelectedOption(nextAnswer.answer);
        }
      }
    }
  }

  function jumpToQuestion(index: number) {
    if (!exam || index === currentQuestionIndex) return;
    
    const targetQuestion = exam.questions[index];
    const isTargetAnswered = userAnswers.some(a => a.questionId === targetQuestion.id);
    
    // 如果不允许自由跳转，则需检查目标题目是否已回答
    if (!canNavigateFreely && !isTargetAnswered) {
      // 未回答的题目只有在当前题目已回答或显示解析的情况下才能跳转到下一题
      const currentQuestion = exam.questions[currentQuestionIndex];
      const isCurrentAnswered = userAnswers.some(a => a.questionId === currentQuestion.id);
      
      // 如果目标题目是当前题目的下一题，并且当前题目已回答或显示了解析，则允许跳转
      if (index === currentQuestionIndex + 1 && (isCurrentAnswered || showExplanation)) {
        // 允许跳转到下一题
      } else {
        // 其他情况不允许跳转到未回答的题目
        return;
      }
    }
    
    // 执行跳转
    setCurrentQuestionIndex(index);
    setSelectedOption('');
    setSelectedOptions([]);
    setShowExplanation(false);
    
    // 恢复之前的选择（如果有）
    const targetAnswer = userAnswers.find(a => a.questionId === targetQuestion.id);
    
    if (targetAnswer) {
      // 显示已回答题目的解析
      setShowExplanation(true);
      
      // 恢复选择
      if (isMultipleChoiceQuestion(targetQuestion.type)) {
        setSelectedOptions([...targetAnswer.answer]);
      } else {
        setSelectedOption(targetAnswer.answer);
      }
    }
  }

  // 计算测试模式的正确率
  const calculateAccuracy = () => {
    if (!exam || userAnswers.length === 0) return 0;
    
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    return (correctCount / userAnswers.length) * 100;
  };

  // 获取错题列表
  const getIncorrectQuestions = () => {
    if (!exam) return [];
    
    return exam.questions.filter(q => 
      userAnswers.some(a => a.questionId === q.id && !a.isCorrect)
    );
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showQuestionDropdown && !target.closest('.relative')) {
        setShowQuestionDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuestionDropdown]);

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">未找到考试信息</p>
          <Link 
            href="/exams"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            返回考试列表
          </Link>
        </div>
      </div>
    );
  }

  if (practiceCompleted) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">练习完成!</h2>
            <div className="text-6xl font-bold mb-6 text-primary-600">{calculateAccuracy().toFixed(1)}%</div>
            <p className="text-gray-600 mb-6">
              您已完成所有 {exam.questions.length} 道题目的练习，其中正确答案 {userAnswers.filter(a => a.isCorrect).length} 道。
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href={`/exams/${examId}`}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                查看详情
              </Link>
              <Link 
                href="/exams"
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                返回列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const options = parseOptions(currentQuestion.options);
  const isMultiChoice = isMultipleChoiceQuestion(currentQuestion.type);

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{exam.title || `考试 ${exam.id}`}</h1>
          
          {/* 题号下拉菜单 */}
          <div className="relative">
            <div 
              className="flex items-center text-sm bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200"
              onClick={() => setShowQuestionDropdown(prev => !prev)}
            >
              题目 {currentQuestionIndex + 1} / {exam.questions.length}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* 下拉菜单 */}
            {showQuestionDropdown && (
              <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white rounded-md shadow-lg z-20">
                <div className="p-2">
                  <div className="mb-2 text-xs text-gray-500 font-medium">跳转到题目</div>
                  <div className="grid grid-cols-5 gap-2">
                    {exam.questions.map((q, idx) => {
                      // 获取题目状态
                      const answer = userAnswers.find(a => a.questionId === q.id);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            jumpToQuestion(idx);
                            setShowQuestionDropdown(false);
                          }}
                          className={`flex justify-center items-center w-full p-1 text-sm rounded
                            ${idx === currentQuestionIndex ? 'bg-primary-600 text-white' : ''}
                            ${answer?.isCorrect ? 'text-green-600 font-medium' : ''}
                            ${answer && !answer.isCorrect ? 'text-red-600 font-medium' : ''}
                            ${!answer && idx !== currentQuestionIndex ? 'text-gray-600' : ''}
                          `}
                        >
                          {idx + 1}
                          {q.hasChart && <span className="ml-1 text-xs text-blue-400">●</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* 题目内容区域 - 使用固定高度的容器 */}
          <div className="flex justify-between items-start mb-4 px-2">
            <h2 className="text-xl font-medium">
              <span className="mr-2">{currentQuestionIndex + 1}.</span>
              {currentQuestion.content}
            </h2>
            <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
              {currentQuestion.type}
              {isMultiChoice && <span className="ml-1 text-primary-600">(多选)</span>}
            </span>
          </div>
          
          {/* 选项区域 - 在固定高度的容器内滚动 */}
          <div className="h-[340px] overflow-y-auto mb-6 px-2">
            <div className="space-y-3">
              {options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                const isSelected = isMultiChoice 
                  ? selectedOptions.includes(optionLetter)
                  : selectedOption === optionLetter;
                
                // 判断是否为正确答案（仅在显示解析时）
                const isCorrectAnswer = showExplanation && (
                  isMultiChoice 
                    ? currentQuestion.answer.includes(optionLetter) 
                    : optionLetter === currentQuestion.answer
                );
                
                return (
                  <div 
                    key={index} 
                    className={`p-3 border rounded-md cursor-pointer transition-colors 
                      ${isSelected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'} 
                      ${isCorrectAnswer ? 'border-green-600 bg-green-50' : ''}`}
                    onClick={() => !showExplanation && handleOptionSelect(option, index)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">
                        {isMultiChoice ? (
                          <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                            isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium mr-2">{optionLetter}.</span>
                        <span>{option}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 图表区域 */}
          {currentQuestion.hasChart && (
            <div className="mb-6">
              <img src={`/charts/${currentQuestion.externalId}.png`} alt="图表" />
            </div>
          )}
        </div>
        
        {/* 选项卡区域 */}
        <div className="py-3 border-t border-b my-4 bg-gray-50 sticky">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push(`/exams/${examId}`)}
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                退出练习
              </button>
              
              {/* 模式切换按钮 */}
              {!testCompleted && (
                <div className="flex items-center text-sm">
                  <span className="mr-2">模式:</span>
                  <div className="flex rounded-md overflow-hidden border border-gray-300">
                    <button
                      onClick={() => setPracticeMode('practice')}
                      className={`px-3 py-1 ${practiceMode === 'practice' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                      练习
                    </button>
                    <button
                      onClick={() => setPracticeMode('test')}
                      className={`px-3 py-1 ${practiceMode === 'test' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                      测试
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              {currentQuestionIndex > 0 && (
                <button 
                  onClick={handlePrevQuestion}
                  className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  上一题
                </button>
              )}
              
              {!showExplanation ? (
                <button 
                  onClick={handleSubmitAnswer}
                  disabled={(isMultiChoice && selectedOptions.length === 0) || (!isMultiChoice && !selectedOption)}
                  className={`bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors 
                    ${(isMultiChoice && selectedOptions.length === 0) || (!isMultiChoice && !selectedOption) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  提交答案
                </button>
              ) : (
                <button 
                  onClick={handleNextQuestion}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {currentQuestionIndex < exam.questions.length - 1 ? '下一题' : '完成练习'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 解析区域 */}
        {showExplanation && (
          <div className="pt-4 px-2">
            <div className="mb-2">
              <span className="font-medium text-primary-600">正确答案: </span>
              {currentQuestion.answer}
            </div>
            
            {currentQuestion.explanation && (
              <div className="text-gray-600">
                <span className="font-medium">解析: </span>
                {currentQuestion.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
