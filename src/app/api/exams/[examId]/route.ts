import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  try {
    // 在 Next.js 15 中，params 是一个 Promise，需要使用 await 获取其属性
    const resolvedParams = await params;
    const examId = resolvedParams.examId;
    
    if (!examId) {
      return NextResponse.json(
        { error: '缺少考试ID' },
        { status: 400 }
      );
    }

    // 获取考试和相关题目
    const exam = await prisma.exam.findUnique({
      where: {
        id: parseInt(examId),
      },
      include: {
        questions: true,
      },
    });

    if (!exam) {
      return NextResponse.json(
        { error: '未找到考试' },
        { status: 404 }
      );
    }

    // 按照题目分类
    const questionsByCategory = {};
    for (const question of exam.questions) {
      const category = question.tags || '其他';
      if (!questionsByCategory[category]) {
        questionsByCategory[category] = [];
      }
      questionsByCategory[category].push(question);
    }

    // 统计每类题目的数量
    const categorySummary = Object.keys(questionsByCategory).map(category => ({
      category,
      count: questionsByCategory[category].length
    }));

    // 合并分类信息和题目信息到返回结果
    const result = {
      ...exam,
      categorySummary,
      questionsByCategory,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取考试详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
