'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 题目接口，与之前的保持一致
interface Question {
    id?: number;
    content: string;
    type: string;
    options: string[];
    answer: string;
    explanation: string;
    hasChart?: boolean;
    externalId?: string;
    tags?: string;
}

// 考试接口
interface Exam {
    id: number;
    title: string;
}

// 题目审核页面组件
export default function ReviewPage({ params }: { params: { examId: string } }) {
    const router = useRouter();
    const examId = parseInt(params.examId);

    // 考试状态
    const [exam, setExam] = useState<Exam | null>(null);

    // 题目列表状态
    const [questions, setQuestions] = useState<Question[]>([]);

    // 当前编辑的题目
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [currentIndex, setCurrentIndex] = useState(-1);

    // 页面状态
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 加载考试和题目数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // 获取考试信息
                const examResponse = await fetch(`/api/exams/${examId}`);
                if (!examResponse.ok) {
                    throw new Error('获取考试信息失败');
                }
                const examData = await examResponse.json();
                setExam(examData);

                // 获取题目列表（这里假设你已经有一个API端点返回AI解析后但尚未最终保存的题目）
                const questionsResponse = await fetch(`/api/exams/${examId}/parsed-questions`);
                if (!questionsResponse.ok) {
                    throw new Error('获取题目列表失败');
                }
                const questionsData = await questionsResponse.json();

                // 确保选项总是数组格式
                const formattedQuestions = questionsData.map((q: any) => ({
                    ...q,
                    options: Array.isArray(q.options) ? q.options :
                        (typeof q.options === 'string' ? JSON.parse(q.options) : [])
                }));

                setQuestions(formattedQuestions);

                if (formattedQuestions.length > 0) {
                    setCurrentQuestion(formattedQuestions[0]);
                    setCurrentIndex(0);
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                setErrorMessage(`加载数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (examId) {
            fetchData();
        }
    }, [examId]);

    // 处理题目字段变更
    const handleQuestionChange = (field: keyof Question, value: any) => {
        if (!currentQuestion) return;

        setCurrentQuestion({
            ...currentQuestion,
            [field]: value
        });

        // 同时更新题目列表中的对应题目
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex] = {
            ...updatedQuestions[currentIndex],
            [field]: value
        };
        setQuestions(updatedQuestions);
    };

    // 处理选项变更
    const handleOptionChange = (index: number, value: string) => {
        if (!currentQuestion) return;

        const newOptions = [...currentQuestion.options];
        newOptions[index] = value;

        handleQuestionChange('options', newOptions);
    };

    // 添加新选项
    const addOption = () => {
        if (!currentQuestion) return;

        const newOptions = [...currentQuestion.options, ''];
        handleQuestionChange('options', newOptions);
    };

    // 删除选项
    const removeOption = (index: number) => {
        if (!currentQuestion) return;

        const newOptions = [...currentQuestion.options];
        newOptions.splice(index, 1);
        handleQuestionChange('options', newOptions);
    };

    // 切换到上一题
    const goToPrevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setCurrentQuestion(questions[currentIndex - 1]);
        }
    };

    // 切换到下一题
    const goToNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentQuestion(questions[currentIndex + 1]);
        }
    };

    // 删除当前题目
    const deleteCurrentQuestion = () => {
        if (currentIndex === -1 || !currentQuestion) return;

        const newQuestions = [...questions];
        newQuestions.splice(currentIndex, 1);
        setQuestions(newQuestions);

        // 更新当前题目指针
        if (newQuestions.length === 0) {
            setCurrentQuestion(null);
            setCurrentIndex(-1);
        } else if (currentIndex >= newQuestions.length) {
            setCurrentIndex(newQuestions.length - 1);
            setCurrentQuestion(newQuestions[newQuestions.length - 1]);
        } else {
            setCurrentQuestion(newQuestions[currentIndex]);
        }
    };

    // 保存所有题目
    const saveAllQuestions = async () => {
        if (!examId || questions.length === 0) {
            setErrorMessage('没有题目可保存');
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage('');

            // 将题目保存到数据库
            const response = await fetch(`/api/exams/${examId}/save-reviewed-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ questions }),
            });

            if (!response.ok) {
                throw new Error('保存题目失败');
            }

            setSuccessMessage('所有题目已成功保存');

            // 延迟重定向
            setTimeout(() => {
                router.push(`/exams/${examId}`);
            }, 2000);

        } catch (error) {
            console.error('保存失败:', error);
            setErrorMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <main className="container mx-auto p-4 max-w-4xl">
            <div className="mb-6">
                <Link href={`/exams/${examId}`} className="text-primary-600 hover:text-primary-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    返回考试详情
                </Link>
            </div>

            {exam && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
                    <p className="text-gray-600 mb-4">审核和编辑AI解析的题目（{questions.length}题）</p>

                    {/* 成功/错误消息 */}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                            {errorMessage}
                        </div>
                    )}

                    {/* 题目导航 */}
                    <div className="mb-6 flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-gray-700 mr-2">进度:</span>
                            <span className="font-medium">{currentIndex + 1} / {questions.length}</span>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={goToPrevQuestion}
                                disabled={currentIndex <= 0}
                                className={`px-3 py-1 rounded ${currentIndex <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                上一题
                            </button>

                            <button
                                onClick={goToNextQuestion}
                                disabled={currentIndex >= questions.length - 1}
                                className={`px-3 py-1 rounded ${currentIndex >= questions.length - 1 ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                下一题
                            </button>
                        </div>
                    </div>

                    {/* 题目编辑区域 */}
                    {currentQuestion ? (
                        <div className="border-t pt-6">
                            <div className="space-y-4">
                                {/* 题目类型 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        题目类型
                                    </label>
                                    <select
                                        value={currentQuestion.type}
                                        onChange={(e) => handleQuestionChange('type', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="单选题">单选题</option>
                                        <option value="多选题">多选题</option>
                                        <option value="判断题">判断题</option>
                                        <option value="填空题">填空题</option>
                                        <option value="简答题">简答题</option>
                                    </select>
                                </div>

                                {/* 题目内容 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        题目内容 <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={currentQuestion.content}
                                        onChange={(e) => handleQuestionChange('content', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
                                        placeholder="输入题目内容"
                                    />
                                </div>

                                {/* 题目标识 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            外部ID (可选)
                                        </label>
                                        <input
                                            type="text"
                                            value={currentQuestion.externalId || ''}
                                            onChange={(e) => handleQuestionChange('externalId', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="例如: 2023-1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            标签/分类 (可选)
                                        </label>
                                        <input
                                            type="text"
                                            value={currentQuestion.tags || ''}
                                            onChange={(e) => handleQuestionChange('tags', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="例如: 大气污染防治"
                                        />
                                    </div>
                                </div>

                                {/* 包含图表 */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="hasChart"
                                        checked={currentQuestion.hasChart || false}
                                        onChange={(e) => handleQuestionChange('hasChart', e.target.checked)}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="hasChart" className="ml-2 block text-sm text-gray-700">
                                        此题包含图表
                                    </label>
                                </div>

                                {/* 选项列表 - 仅对选择题显示 */}
                                {['单选题', '多选题'].includes(currentQuestion.type) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            选项列表
                                        </label>
                                        <div className="space-y-2">
                                            {currentQuestion.options.map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                                        className="flex-1 p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(index)}
                                                        className="p-2 text-red-600 hover:text-red-800"
                                                        title="删除选项"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                        >
                                            + 添加选项
                                        </button>
                                    </div>
                                )}

                                {/* 答案 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        正确答案 <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mb-1 text-xs text-gray-500">
                                        {currentQuestion.type === '单选题' && '请输入选项字母，如: A'}
                                        {currentQuestion.type === '多选题' && '请输入选项字母，如: ABC'}
                                        {currentQuestion.type === '判断题' && '请输入"正确"或"错误"'}
                                    </div>
                                    <input
                                        type="text"
                                        value={currentQuestion.answer}
                                        onChange={(e) => handleQuestionChange('answer', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="输入正确答案"
                                    />
                                </div>

                                {/* 解析 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        解析 (可选)
                                    </label>
                                    <textarea
                                        value={currentQuestion.explanation}
                                        onChange={(e) => handleQuestionChange('explanation', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
                                        placeholder="输入题目解析"
                                    />
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex justify-between pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={deleteCurrentQuestion}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                    >
                                        删除此题
                                    </button>

                                    <div className="space-x-3">
                                        <button
                                            type="button"
                                            onClick={goToPrevQuestion}
                                            disabled={currentIndex <= 0}
                                            className={`px-4 py-2 rounded-md ${currentIndex <= 0 ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            上一题
                                        </button>

                                        <button
                                            type="button"
                                            onClick={goToNextQuestion}
                                            disabled={currentIndex >= questions.length - 1}
                                            className={`px-4 py-2 rounded-md ${currentIndex >= questions.length - 1 ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            下一题
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            没有题目可以编辑
                        </div>
                    )}

                    {/* 保存按钮 */}
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={saveAllQuestions}
                            disabled={isSaving || questions.length === 0}
                            className={`px-6 py-2 rounded-md font-medium ${isSaving || questions.length === 0 ? 'bg-gray-300 text-gray-500' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                        >
                            {isSaving ? '保存中...' : '保存所有题目'}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}