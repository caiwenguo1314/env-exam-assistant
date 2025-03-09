import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

export async function DELETE(request: NextRequest) {
  try {
    // 从URL获取examId
    const url = new URL(request.url);
    const examId = url.searchParams.get('examId');

    if (!examId) {
      return NextResponse.json(
        { error: '缺少试卷ID' },
        { status: 400 }
      );
    }

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) {
      return NextResponse.json(
        { error: '无效的试卷ID' },
        { status: 400 }
      );
    }

    console.log(`开始删除试卷，ID: ${examIdNum}`);

    // 查找试卷信息，包括关联的文件路径
    const exam = await prisma.exam.findUnique({
      where: { id: examIdNum },
    });

    if (!exam) {
      return NextResponse.json(
        { error: '试卷不存在' },
        { status: 404 }
      );
    }

    // 删除关联的题目
    console.log(`删除试卷关联的题目`);
    await prisma.question.deleteMany({
      where: { examId: examIdNum },
    });

    // 删除试卷记录
    console.log(`删除试卷记录`);
    await prisma.exam.delete({
      where: { id: examIdNum },
    });

    // 尝试删除关联的PDF文件（如果有）
    try {
      // 查找可能的文件路径
      const uploadDir = join(process.cwd(), 'uploads');
      const files = existsSync(uploadDir) ? 
        (await import('fs')).readdirSync(uploadDir) : [];
      
      // 查找包含试卷ID的文件名
      const examFiles = files.filter(file => {
        return file.includes(`_${examIdNum}_`) || file.includes(`_${examIdNum}.pdf`);
      });

      if (examFiles.length > 0) {
        for (const file of examFiles) {
          const filePath = join(uploadDir, file);
          console.log(`尝试删除文件: ${filePath}`);
          await unlink(filePath);
        }
        console.log(`删除了 ${examFiles.length} 个关联文件`);
      } else {
        console.log('未找到关联的PDF文件');
      }
    } catch (fileError) {
      console.error('删除文件时出错:', fileError);
      // 不因为文件删除失败而中断整个操作
    }

    return NextResponse.json({
      success: true,
      message: '试卷已成功删除',
    });
  } catch (error) {
    console.error('删除试卷时出错:', error);
    return NextResponse.json(
      { error: `删除失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
