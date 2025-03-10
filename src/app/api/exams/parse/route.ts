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
    const chunkSize = 3000; // 每页大约3000个字符
    const overlap = 500;   // 页面间的重叠内容
    const chunks = [];
    
    for (let i = 0; i < pdfText.length; i += (chunkSize - overlap)) {
      const endPos = Math.min(i + chunkSize, pdfText.length);
      chunks.push(pdfText.substring(i, endPos));
      if (endPos === pdfText.length) break;
    }
    
    console.log(`将文本分拆成 ${chunks.length} 个“页面”`);
    
    // 处理块，提取问题
    let allQuestions = [];
    let processingErrors = 0;
    let emptyChunks = 0;
    let retryChunks = []; // 需要重试的块
    
    console.log('开始处理块，提取问题');
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      console.log(`----- 开始处理第 ${chunkIndex+1}/${chunks.length} 个块 -----`);
      const chunk = chunks[chunkIndex];
      console.log(`块 ${chunkIndex+1} 大小: ${chunk.length} 个字符`);
      console.log(`块 ${chunkIndex+1} 的前100个字符: ${chunk.substring(0, 100).replace(/\n/g, ' ')}...`);
      console.log(`块 ${chunkIndex+1} 的后100个字符: ...${chunk.substring(chunk.length - 100).replace(/\n/g, ' ')}`);
      
      try {
        // 使用 AI 提取问题
        const extractedQuestions = await extractQuestionsWithAI(chunk);
        console.log(`从块 ${chunkIndex+1} 中提取了 ${extractedQuestions.length} 个问题`);
        
        if (extractedQuestions.length > 0) {
          // 显示块中提取的问题类型和第一个问题内容
          console.log(`块 ${chunkIndex+1} 中的问题类型:`, extractedQuestions.map(q => q.type).join(', '));
          console.log(`块 ${chunkIndex+1} 中的第一个问题内容:`, extractedQuestions[0].content.substring(0, 50));
          
          // 显示块中提取的问题编号
          const questionIds = extractedQuestions.map(q => {
            if (q.content) {
              const prefixContent = q.content.substring(0, 50);
              const idMatch = prefixContent.match(/^\s*(\d{4}[-\u2014]\d+|\d+[-\u2014]\d+|\u7ec3\u4e60\s*\d+|\u9898\s*\d+|\u7b2c\s*\d+\s*\u9898|\d+\.)/i);
              return idMatch ? idMatch[0].trim() : q.content.substring(0, 20);
            }
            return '无编号';
          }).join(', ');
          
          console.log(`块 ${chunkIndex+1} 中的问题编号: ${questionIds}`);
        } else {
          console.log(`块 ${chunkIndex+1} 中没有提取到问题`);
          emptyChunks++;
          
          // 如果块中包含问题编号，则添加到重试列表
          if (chunk.match(/\d{4}[-\u2014]\d+|\u7ec3\u4e60\s*\d+|\u9898\s*\d+|\u7b2c\s*\d+\s*\u9898|\(\s*\u4e0d\u5b9a\u9898\s*\)|\(\s*\u5355\u9009\s*\)/)) {
            console.log(`块 ${chunkIndex+1} 可能包含问题编号，添加到重试列表`);
            retryChunks.push({index: chunkIndex, chunk: chunk});
          }
          
          // 显示块的内容前300个字符，用于检查是否有问题
          console.log(`块 ${chunkIndex+1} 的内容前300个字符:`, chunk.substring(0, 300).replace(/\n/g, ' '));
        }
        
        // 将提取的问题添加到 allQuestions 数组中
        allQuestions = allQuestions.concat(extractedQuestions);
      } catch (error) {
        processingErrors++;
        console.error(`处理块 ${chunkIndex+1} 失败:`, error);
        console.error(`错误信息:`, error.message);
        
        // 将失败的块添加到重试列表
        console.log(`块 ${chunkIndex+1} 处理失败，添加到重试列表`);
        retryChunks.push({index: chunkIndex, chunk: chunk});
      }
    }
    
    // 重试处理失败的块
    if (retryChunks.length > 0) {
      console.log(`===== 开始重试处理 ${retryChunks.length} 个块 =====`);
      
      for (let i = 0; i < retryChunks.length; i++) {
        const {index, chunk} = retryChunks[i];
        console.log(`----- 重试处理第 ${i+1}/${retryChunks.length} 个块 (原块号: ${index}) -----`);
        
        try {
          // 重试提取问题
          const extractedQuestions = await extractQuestionsWithAI(chunk, 0.2);
          console.log(`重试成功，从块中提取了 ${extractedQuestions.length} 个问题`);
          
          if (extractedQuestions.length > 0) {
            // 将提取的问题添加到 allQuestions 数组中
            allQuestions = allQuestions.concat(extractedQuestions);
            processingErrors--; // 减少错误计数
          }
        } catch (retryError) {
          console.error(`重试处理块失败:`, retryError.message);
        }
      }
    }
    
    console.log(`处理块完成，共提取了 ${allQuestions.length} 个问题`);
    console.log(`处理块统计: 总块数=${chunks.length}, 处理错误块数=${processingErrors}, 空块数=${emptyChunks}`);
    
    // 检查最大的问题编号
    let maxQuestionNumber = 0;
    const questionNumbersFound = [];
    
    allQuestions.forEach(q => {
      if (q.content) {
        // 匹配类似 "2022-79" 这样的编号格式
        const match = q.content.match(/^\s*(\d{4})[-\u2014](\d+)/);
        if (match) {
          const year = parseInt(match[1]);
          const num = parseInt(match[2]);
          questionNumbersFound.push(`${year}-${num}`);
          if (year >= 2000 && year <= 2030 && num > maxQuestionNumber) {
            maxQuestionNumber = num;
          }
        }
      }
    });
    
    console.log(`发现的问题编号: ${questionNumbersFound.join(', ')}`);
    console.log(`最大的问题编号: ${maxQuestionNumber}`);
    
    // 检查是否有缺失的问题编号
    if (maxQuestionNumber > 0) {
      const missingNumbers = [];
      for (let i = 1; i <= maxQuestionNumber; i++) {
        const matchingQuestions = allQuestions.filter(q => 
          q.content && q.content.match(new RegExp(`^\\s*\\d{4}[-\\u2014]${i}[^\\d]`)));
        if (matchingQuestions.length === 0) {
          missingNumbers.push(i);
        }
      }
      if (missingNumbers.length > 0) {
        console.log(`可能缺失的问题编号: ${missingNumbers.join(', ')}`);
      }
    }
    
    // 去重复问题 - 使用新的基于题目编号的去重逻辑
    const uniqueQuestions = removeDuplicateQuestions(allQuestions);
    console.log(`去重复问题完成，共 ${uniqueQuestions.length} 个问题`);
    
    // 保存问题到数据库
    console.log('开始保存问题到数据库');
    
    // 直接保存去重后的问题
    const savedQuestions = await saveQuestionsToDB(uniqueQuestions, examId);
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
  console.log(`开始处理题目去重复，共 ${questions.length} 个题目`);
  
  // 先过滤掉内容为空的题目
  const filteredQuestions = questions.filter(question => {
    // 过滤掉内容为空的题目
    if (!question.content || question.content.trim() === '') {
      console.log(`移除内容为空的题目: ${JSON.stringify(question).substring(0, 100)}...`);
      return false;
    }
    
    // 过滤掉内容过短的题目
    const trimmedContent = question.content.trim();
    if (trimmedContent.length <= 5) {
      console.log(`移除内容过短的题目 (长度小于5个字符): ${JSON.stringify(question).substring(0, 100)}...`);
      return false;
    }
    
    // 过滤掉可能是答案的题目
    if (/^\s*(\u7b54\u6848|\u7b54\u6848\u662f|\u7b54\u6848\u4e3a|\u89e3\u7b54\u662f|\u89e3\u6cd5\u662f)[\s:uff1au4e3a].*$/i.test(trimmedContent)) {
      console.log(`移除可能是答案的题目: ${JSON.stringify(question).substring(0, 100)}...`);
      return false;
    }
    
    // 过滤掉可能是选项的题目 (如 "67. :C")
    if (/^\s*\d+\.?\s*[:uff1a]\s*[A-Da-d]+\s*$/i.test(trimmedContent)) {
      console.log(`移除可能是选项的题目: ${trimmedContent}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`过滤后剩余 ${filteredQuestions.length} 个题目`);
  
  // 使用 Map 存储已经处理的题目编号
  const seenQuestionIds = new Map();
  const uniqueQuestions = [];
  
  for (const question of filteredQuestions) {
    // 提取题目编号作为唯一标识
    let questionId = '';
    
    if (question.content) {
      // 匹配类似 "练习1"、"2022-37" 这样的编号格式
      const prefixContent = question.content.substring(0, 50); // 取内容的前50个字符
      
      // 匹配类似 "2007修改（某某某）" 这样的编号格式
      const fullPrefixMatch = prefixContent.match(/^\s*(\d{4}[\-\s]*\u6539\u7f16[\s\uff08\(].*?[\)\uff09]|\d{4}[\-\s]*[\s\uff08\(].*?[\)\uff09])/i);
      
      if (fullPrefixMatch) {
        // 使用匹配到的内容作为题目编号
        questionId = fullPrefixMatch[0].trim();
        console.log(`提取到题目编号: ${questionId}`);
      } else {
        // 匹配类似 "练习1"、"2022-37" 这样的编号格式
        const simpleIdMatch = prefixContent.match(/^\s*(\d{4}[-\u2014]\d+|\d+[-\u2014]\d+|\u7ec3\u4e60\s*\d+|\u9898\s*\d+|\u7b2c\s*\d+\s*\u9898|\d+\.)/i);
        if (simpleIdMatch) {
          questionId = simpleIdMatch[0].trim();
          // 匹配类似 "2007（某某某）" 这样的编号格式
          const bracketMatch = prefixContent.match(new RegExp(`^\\s*${questionId}\\s*[\\(\\uff08](.*?)[\\)\\uff09]`));
          if (bracketMatch) {
            questionId = (simpleIdMatch[0] + bracketMatch[0].substring(simpleIdMatch[0].length)).trim();
            console.log(`提取到题目编号和括号内容: ${questionId}`);
          } else {
            console.log(`提取到题目编号: ${questionId}`);
          }
        }
      }
    }
    
    // 如果找不到编号，尝试使用id字段
    if (!questionId && question.id) {
      questionId = `ID${question.id}`; // 加上前缀区分原题目编号
    }
    
    // 如果还是找不到编号，使用内容的前50个字符作为备用
    if (!questionId && question.content) {
      // 取内容的前10个字符
      questionId = `Content_${question.content.substring(0, 10)}`;
    } else if (!questionId) {
      // 如果没有任何有效编号，使用随机字符串
      questionId = `Unknown_${Math.random().toString(36).substring(2, 8)}`;
    }
    
    // 如果已经存在此编号的题目，则合并信息，保留更完整的版本
    if (seenQuestionIds.has(questionId)) {
      console.log(`发现重复题目，编号: ${questionId}`);
    } else {
      seenQuestionIds.set(questionId, true);
      uniqueQuestions.push(question);
    }
  }
  
  console.log(`处理题目去重复完成，共 ${uniqueQuestions.length} 个题目`);
  return uniqueQuestions;
}
