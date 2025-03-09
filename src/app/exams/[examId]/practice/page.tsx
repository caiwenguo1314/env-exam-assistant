'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeUnicodeEscapes } from '@/lib/utils';

type Question = {
  id: number;
  content: string;
  type: string;
  options: string;
  answer: string;
  explanation: string;
};

type Exam = {
  id: number;
  title: string;
  questions: Question[];
};

type UserAnswer = {
  questionId: number;
  answer: string;
  isCorrect: boolean;
};

export default function PracticePage({ params }: { params: { examId: string } }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
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
        
        // u5904u7406u53efu80fdu7684u4e71u7801u95eeu9898
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

  function parseOptions(optionsStr: string): string[] {
    try {
      // u5904u7406u9009u9879u4e2du53efu80fdu7684u4e71u7801
      const decodedOptionsStr = decodeUnicodeEscapes(optionsStr);
      const options = JSON.parse(decodedOptionsStr);
      if (Array.isArray(options)) {
        return options;
      }
      return [decodedOptionsStr];
    } catch (e) {
      return [decodeUnicodeEscapes(optionsStr)];
    }
  }

  function handleOptionSelect(option: string, index: number) {
    setSelectedOption(String.fromCharCode(65 + index));
  }

  function handleSubmitAnswer() {
    if (!exam || !selectedOption) return;
    
    const currentQuestion = exam.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.answer;
    
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      answer: selectedOption,
      isCorrect,
    };
    
    setUserAnswers([...userAnswers, newAnswer]);
    setShowExplanation(true);
  }

  function handleNextQuestion() {
    if (!exam) return;
    
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption('');
      setShowExplanation(false);
    } else {
      setPracticeCompleted(true);
    }
  }

  function calculateScore() {
    if (!userAnswers.length) return 0;
    const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
    return Math.round((correctAnswers / userAnswers.length) * 100);
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">u52a0u8f7du4e2d...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">u672au627eu5230u8003u8bd5u4fe1u606f</p>
          <Link 
            href="/exams"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            u8fd4u56deu8003u8bd5u5217u8868
          </Link>
        </div>
      </div>
    );
  }

  if (practiceCompleted) {
    const score = calculateScore();
    
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">u7ec3u4e60u5b8cu6210!</h2>
            <div className="text-6xl font-bold mb-6 text-primary-600">{score}%</div>
            <p className="text-gray-600 mb-6">
              u60a8u5df2u5b8cu6210u6240u6709 {exam.questions.length} u9053u9898u76eeu7684u7ec3u4e60uff0cu5176u4e2du6b63u786eu7b54u6848 {userAnswers.filter(a => a.isCorrect).length} u9053u3002
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href={`/exams/${examId}`}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                u67e5u770bu8be6u60c5
              </Link>
              <Link 
                href="/exams"
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                u8fd4u56deu5217u8868
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const options = parseOptions(currentQuestion.options);

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{exam.title || `u8003u8bd5 ${exam.id}`}</h1>
          <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
            u9898u76ee {currentQuestionIndex + 1} / {exam.questions.length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-medium">
              <span className="mr-2">{currentQuestionIndex + 1}.</span>
              {currentQuestion.content}
            </h2>
            <span className="text-sm px-2 py-1 bg-gray-100 rounded-md">
              {currentQuestion.type}
            </span>
          </div>
          
          <div className="space-y-3 mb-6">
            {options.map((option, index) => (
              <div 
                key={index} 
                className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedOption === String.fromCharCode(65 + index) ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'} ${showExplanation && String.fromCharCode(65 + index) === currentQuestion.answer ? 'border-green-600 bg-green-50' : ''}`}
                onClick={() => !showExplanation && handleOptionSelect(option, index)}
              >
                <div className="flex items-start">
                  <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                  <span>{option}</span>
                </div>
              </div>
            ))}
          </div>
          
          {showExplanation && (
            <div className="border-t pt-4 mb-4">
              <div className="mb-2">
                <span className="font-medium text-primary-600">u6b63u786eu7b54u6848: </span>
                {currentQuestion.answer}
              </div>
              
              {currentQuestion.explanation && (
                <div className="text-gray-600">
                  <span className="font-medium">u89e3u6790: </span>
                  {currentQuestion.explanation}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between">
            <button 
              onClick={() => router.push(`/exams/${examId}`)}
              className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
              u9000u51fau7ec3u4e60
            </button>
            
            {!showExplanation ? (
              <button 
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className={`bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors ${!selectedOption ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                u63d0u4ea4u7b54u6848
              </button>
            ) : (
              <button 
                onClick={handleNextQuestion}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {currentQuestionIndex < exam.questions.length - 1 ? 'u4e0bu4e00u9898' : 'u5b8cu6210u7ec3u4e60'}
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {exam.questions.map((_, index) => (
              <div 
                key={index} 
                className={`w-3 h-3 rounded-full ${index === currentQuestionIndex ? 'bg-primary-600' : userAnswers.some(a => a.questionId === exam.questions[index].id && a.isCorrect) ? 'bg-green-500' : userAnswers.some(a => a.questionId === exam.questions[index].id && !a.isCorrect) ? 'bg-red-500' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
