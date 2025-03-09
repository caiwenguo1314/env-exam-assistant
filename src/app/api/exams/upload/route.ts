import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';

// 最大文件大小 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('开始处理文件上传请求');
    
    // 检查请求是否是 multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    console.log('请求 Content-Type:', contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      console.log('请求不是 multipart/form-data 格式');
      return NextResponse.json(
        { error: '请求必须是 multipart/form-data 格式' },
        { status: 400 }
      );
    }

    // 获取表单数据
    console.log('尝试获取表单数据');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('未找到文件');
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    console.log('文件信息:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      console.log('文件类型不是 PDF');
      return NextResponse.json(
        { error: '只支持 PDF 文件' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      console.log('文件大小超过限制');
      return NextResponse.json(
        { error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 创建上传目录（如果不存在）
    const uploadDir = join(process.cwd(), 'uploads');
    console.log('上传目录:', uploadDir);
    
    if (!existsSync(uploadDir)) {
      console.log('创建上传目录');
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedName}_${timestamp}.pdf`;
    const filePath = join(uploadDir, fileName);
    console.log('文件将保存到:', filePath);

    try {
      // 将文件写入磁盘
      console.log('开始写入文件');
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      console.log('文件写入成功');
    } catch (writeError) {
      console.error('文件写入错误:', writeError);
      return NextResponse.json(
        { error: '文件保存失败', details: writeError instanceof Error ? writeError.message : '未知错误' },
        { status: 500 }
      );
    }

    try {
      // 检查默认用户是否存在，如果不存在则创建
      console.log('检查默认用户是否存在');
      let userId = 1;
      const defaultUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!defaultUser) {
        console.log('创建默认用户');
        const newUser = await prisma.user.create({
          data: {
            id: userId,
            name: '默认用户',
            email: 'default@example.com',
          }
        });
        console.log('默认用户创建成功:', newUser.id);
      } else {
        console.log('默认用户已存在:', defaultUser.id);
      }
      
      // 创建考试记录
      console.log('创建考试记录');
      const exam = await prisma.exam.create({
        data: {
          title: originalName,
          description: '从PDF上传的试卷',
          userId,
        },
      });
      console.log('考试记录创建成功:', exam.id);

      // 返回成功响应
      return NextResponse.json({
        message: '文件上传成功',
        examId: exam.id,
        filePath: fileName, // 返回文件名
      });
    } catch (dbError) {
      console.error('数据库错误:', dbError);
      return NextResponse.json(
        { error: '数据库操作失败', details: dbError instanceof Error ? dbError.message : '未知错误' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('上传处理错误:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}