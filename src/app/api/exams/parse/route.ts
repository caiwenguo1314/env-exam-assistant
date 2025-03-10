import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { extractTextFromPdf } from '@/lib/services/pdf-service';
import { extractQuestionsWithAI } from '@/lib/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.json();
    const { examId, filePath: originalFilePath } = body;
    let filePath = originalFilePath;

    console.log('开始解析 PDF', { examId, filePath });

    if (!filePath || !examId) {
      console.log('缺少必要参数');
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查文件是否存在
    console.log('检查文件是否存在，完整路径:', filePath);
    if (!existsSync(filePath)) {
      console.log('文件不存在，尝试检查是否是相对路径');
      // 尝试作为相对路径处理
      const absolutePath = join(process.cwd(), 'uploads', filePath);
      console.log('尝试使用绝对路径:', absolutePath);
      
      if (!existsSync(absolutePath)) {
        console.log('文件在绝对路径下也不存在');
        return NextResponse.json(
          { error: '文件不存在' },
          { status: 404 }
        );
      } else {
        console.log('文件在绝对路径下存在，使用此路径');
        filePath = absolutePath;
      }
    }

    // 读取 PDF 文件内容
    console.log('读取 PDF 文件内容');
    const fileBuffer = await readFile(filePath);
    console.log('成功读取 PDF 文件内容，大小:', fileBuffer.length, 'bytes');

    // 提取 PDF 文本
    console.log('开始提取 PDF 文本');
    const pdfText = await extractTextFromPdf(fileBuffer);
    console.log(`提取了 ${pdfText.length} 个字符`);

    // 开始分页处理，分成更小的文本块以确保AI能够完整处理
    console.log('开始分页处理');
    
    // 对文本进行分页处理
    // 定义一个大的分页指标，比正常文本分块要大得多
    const pageSize = 10000; // 每页大约6000-10000个字符，相当于一页PDF
    const overlap = 1000;  // 页面间的重叠内容
    const pages = [];
    
    // 将文本分拆成“页面”
    for (let i = 0; i < pdfText.length; i += (pageSize - overlap)) {
      const endPos = Math.min(i + pageSize, pdfText.length);
      pages.push(pdfText.substring(i, endPos));
      if (endPos === pdfText.length) break;
    }
    
    console.log(`将文本分拆成 ${pages.length} 个“页面”`);
    
    // 进一步分割文本处理，分成更小的文本块以确保AI能够完整处理
    const chunkSize = 6000; // 每块大约6000个字符
    const chunkOverlap = 2000; // 块间的重叠内容
    
    // 处理“页面”文本块，进一步分割成更小的块
    const chunkedPages = [];
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      console.log(`===== 开始处理第 ${pageIndex+1}/${pages.length} 个“页面” =====`);
      const page = pages[pageIndex];
      console.log(`“页面” ${pageIndex+1} 大小: ${page.length} 个字符`);
      
      // 将“页面”分拆成更小的块
      const pageChunks = [];
      for (let i = 0; i < page.length; i += (chunkSize - chunkOverlap)) {
        const endPos = Math.min(i + chunkSize, page.length);
        pageChunks.push(page.substring(i, endPos));
        if (endPos === page.length) break;
      }
      
      console.log(`将“页面” ${pageIndex+1} 分拆成 ${pageChunks.length} 个块`);
      
      // 将块添加到 chunkedPages 数组中
      chunkedPages.push(...pageChunks);
    }
    
    console.log(`进一步分割文本处理完成，共 ${chunkedPages.length} 个块`);
    
    // 处理块，提取问题
    let allQuestions = [];
    const pageResults = [];
    
    console.log('开始处理块，提取问题');
    for (let chunkIndex = 0; chunkIndex < chunkedPages.length; chunkIndex++) {
      console.log(`----- 开始处理第 ${chunkIndex+1}/${chunkedPages.length} 个块 -----`);
      const chunk = chunkedPages[chunkIndex];
      console.log(`块 ${chunkIndex+1} 大小: ${chunk.length} 个字符`);
      
      try {
        // 使用 AI 提取问题
        const extractedQuestions = await extractQuestionsWithAI(chunk);
        console.log(`从块 ${chunkIndex+1} 中提取了 ${extractedQuestions.length} 个问题`);
        
        if (extractedQuestions.length > 0) {
          console.log(`块 ${chunkIndex+1} 中的问题类型:`, extractedQuestions.map(q => q.type).join(', '));
          console.log(`块 ${chunkIndex+1} 中的第一个问题内容:`, extractedQuestions[0].content.substring(0, 50));
        } else {
          console.log(`块 ${chunkIndex+1} 中没有提取到问题`);
        }
        
        // 将提取的问题添加到 allQuestions 数组中
        allQuestions = allQuestions.concat(extractedQuestions);
      } catch (error) {
        console.error(`处理块 ${chunkIndex+1} 失败:`, error);
      }
    }
    
    console.log(`处理块完成，共提取了 ${allQuestions.length} 个问题`);
    
    // 去重复问题
    const uniqueQuestions = removeDuplicateQuestions(allQuestions);
    console.log(`去重复问题完成，共 ${uniqueQuestions.length} 个问题`);
    
    // 保存问题到数据库
    console.log('开始保存问题到数据库');
    
    // 先去重复问题
    const questionMap = new Map();
    const uniqueQuestionsToSave = [];
    let duplicateBeforeSave = 0;
    
    // 开始去重复问题 - 使用新的签名
    for (const question of uniqueQuestions) {
      // 创建一个唯一的签名，用于检查问题重复
      // 使用问题类型和内容的前100个字符作为签名
      const contentSignature = question.content ? 
        question.content.trim().substring(0, 100) : '';
      
      // 从内容中取出第一个选项的前20个字符
      let firstOption = '';
      if (question.options && question.options.length > 0) {
        firstOption = question.options[0].substring(0, 20);
      }
      
      // 使用新的签名
      const signature = `${question.type}_${contentSignature}_${firstOption}`;
      
      // 必须有内容且长度大于15
      if (!questionMap.has(signature) && contentSignature.length > 15) {
        questionMap.set(signature, question);
        uniqueQuestionsToSave.push(question);
      } else if (contentSignature.length <= 15) {
        console.log('内容过短，跳过:', contentSignature);
      } else {
        duplicateBeforeSave++;
      }
    }
    
    console.log(`整体去重复结果: 总数=${uniqueQuestions.length}, 去重后=${uniqueQuestionsToSave.length}, 重复=${duplicateBeforeSave}`);
    
    // 保存去重后的问题
    const savedQuestions = await saveQuestionsToDB(uniqueQuestionsToSave, examId);
    console.log(`保存了 ${savedQuestions.length} 个问题到数据库`);

    // 按照分类组合问题
    const questionsByCategory = {};
    for (const question of savedQuestions) {
      const category = question.tags || '其他';
      if (!questionsByCategory[category]) {
        questionsByCategory[category] = [];
      }
      questionsByCategory[category].push(question);
    }

    // 统计每类问题的数量
    const categorySummary = Object.keys(questionsByCategory).map(category => ({
      category,
      count: questionsByCategory[category].length
    }));

    console.log('问题分类统计:', categorySummary);

    return NextResponse.json({
      success: true,
      examId: examId,
      questionCount: savedQuestions.length,
      categorySummary,
      questionsByCategory,
    });
  } catch (error) {
    console.error('解析 PDF 失败', error);
    return NextResponse.json(
      { error: `解析 PDF 失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

/**
 * 保存问题到数据库
 */
async function saveQuestionsToDB(questions: any[], examId: number) {
  try {
    console.log(`准备保存 ${questions.length} 个题目到数据库`);
    
    // 对提取的题目进行去重处理
    const uniqueQuestions = removeDuplicateQuestions(questions);
    console.log(`去重后剩余 ${uniqueQuestions.length} 个题目`);
    
    // 创建题目记录
    const savedQuestions = [];
    let savedCount = 0;
    
    for (const q of uniqueQuestions) {
      try {
        // 将选项转换为JSON字符串
        const optionsJson = JSON.stringify(q.options || []);
        
        // 准备题目数据
        const questionData = {
          examId: examId,
          content: q.content || '',
          type: q.type || '单选题',
          options: optionsJson,
          answer: q.answer || '',
          explanation: q.explanation || '',
          tags: q.category || '',
          hasChart: q.hasChart === true, // 新增：是否包含图表标记
          externalId: q.id || '', // 新增：保留原题目编号
        };
        
        // 保存到数据库
        const savedQuestion = await prisma.question.create({
          data: questionData,
        });
        
        // 将保存的题目添加到结果数组
        savedQuestions.push({
          ...savedQuestion,
          tags: questionData.tags // 确保tags字段包含在返回中
        });
        
        savedCount++;
      } catch (error) {
        console.error(`保存题目失败:`, error);
      }
    }
    
    console.log(`成功保存 ${savedCount} 个题目到数据库`);
    return savedQuestions; // 返回保存的题目数组而不是数量
  } catch (error) {
    console.error('保存题目到数据库失败:', error);
    throw error;
  }
}

// 移除重复问题
function removeDuplicateQuestions(questions) {
  const uniqueQuestions = [];
  const questionMap = new Map();

  for (const question of questions) {
    const contentSignature = question.content ? question.content.trim().substring(0, 100) : '';
    const signature = `${question.type}_${contentSignature}`;

    if (!questionMap.has(signature)) {
      questionMap.set(signature, true);
      uniqueQuestions.push(question);
    }
  }

  return uniqueQuestions;
}
