import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取所有考试记录
    const exams = await prisma.exam.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    // 格式化返回数据
    const formattedExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      createdAt: exam.createdAt,
      questionCount: exam._count.questions
    }));

    return NextResponse.json(formattedExams);
  } catch (error) {
    console.error('获取考试列表失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
