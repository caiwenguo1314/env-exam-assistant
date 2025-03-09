import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * 从 PDF 文件中提取文本内容
 * @param buffer PDF 文件的 Buffer
 * @returns 提取的文本内容
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    console.log('PDF 文件大小:', buffer.length, 'bytes');
    
    const options = {
      // 设置一些 PDF 解析选项
      pagerender: undefined, // 使用默认的页面渲染器
      max: 0, // 解析所有页面
    };
    
    const data = await pdfParse(buffer, options);
    console.log('PDF 解析成功，页数:', data.numpages);
    console.log('PDF 文本长度:', data.text.length);
    
    return data.text;
  } catch (error) {
    console.error('PDF 解析错误:', error);
    throw new Error(`无法解析 PDF 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从文本中提取可能的题目块
 * @param text 预处理后的文本
 * @returns 可能的题目块数组
 */
export function extractPossibleQuestionBlocks(text: string): string[] {
  if (!text) return [];
  
  // 匹配题目块的正则表达式 - 改进版本
  // 1. 匹配数字+点+空格开头的内容 (如 "1. 题目")
  // 2. 匹配选择题选项 (如 "A. 选项A")
  // 3. 匹配判断题的"正确"或"错误"关键词
  const questionPatterns = [
    // 匹配数字编号开头的题目
    /(?:\d+\s*[.．]\s*|[一二三四五六七八九十]\s*[、.．]\s*)([^\n]+[\s\S]*?)(?=\d+\s*[.．]|[一二三四五六七八九十]\s*[、.．]|$)/g,
    // 匹配选项模式 (A. B. C. D.)
    /(?:[A-D]\s*[.．]\s*[^\n]+[\s\S]*?)(?=[A-D]\s*[.．]|\d+\s*[.．]|[一二三四五六七八九十]\s*[、.．]|$)/g,
    // 匹配"题目"关键词
    /(?:(?:单选题|多选题|判断题|填空题|简答题|论述题)\s*[:：]?\s*[^\n]+[\s\S]*?)(?=(?:单选题|多选题|判断题|填空题|简答题|论述题)|\d+\s*[.．]|$)/g
  ];
  
  let allMatches: string[] = [];
  
  // 尝试每种模式
  for (const pattern of questionPatterns) {
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      allMatches = [...allMatches, ...matches];
    }
  }
  
  // 去重并按照在原文中的位置排序
  const uniqueMatches = Array.from(new Set(allMatches));
  const sortedMatches = uniqueMatches.sort((a, b) => {
    return text.indexOf(a) - text.indexOf(b);
  });
  
  console.log(`提取到 ${sortedMatches.length} 个可能的题目块`);
  
  // 如果没有匹配到任何题目块，或者匹配到的题目块太少，返回整个文本
  if (sortedMatches.length === 0) {
    console.log('没有匹配到题目块，返回整个文本');
    return [text];
  }
  
  // 如果匹配到的题目块太小，可能是误匹配，返回整个文本
  const validBlocks = sortedMatches.filter(block => block.length > 30);
  if (validBlocks.length === 0) {
    console.log('匹配到的题目块太小，返回整个文本');
    return [text];
  }
  
  console.log(`过滤后有 ${validBlocks.length} 个有效题目块`);
  return validBlocks;
}

/**
 * 预处理 PDF 文本，清理和格式化
 * @param text 原始 PDF 文本
 * @returns 处理后的文本
 */
export function preprocessPdfText(text: string): string {
  if (!text) {
    console.warn('警告: 输入的 PDF 文本为空');
    return '';
  }
  
  console.log('开始预处理 PDF 文本，原始长度:', text.length);
  
  // 步骤 1: 处理常见的 PDF 提取问题
  let processed = text;
  
  // 移除页码和页尾
  processed = processed.replace(/\d+\s*\/\s*\d+\s*\n/g, '\n'); // 移除类似 "1 / 10" 的页码
  processed = processed.replace(/Page\s*\d+\s*of\s*\d+/gi, ''); // 移除类似 "Page 1 of 10" 的页码
  
  // 合并跨页的段落
  processed = processed.replace(/([^\n.!?])\s*\n\s*([a-z\u4e00-\u9fa5])/gi, '$1 $2');
  
  // 步骤 2: 压缩多余的空白字符
  // 将多个空白字符压缩为一个空格
  processed = processed.replace(/\s+/g, ' ');
  
  // 步骤 3: 处理标题和项目符号
  // 将类似 "1. 标题" 的标题符号规范化
  processed = processed.replace(/(\d+)\s*[.\uff0e]\s*/g, '$1. ');
  
  // 将选项符号规范化，保持选项符号在段落开头
  processed = processed.replace(/([A-D])\s*[.\uff0e]\s*/g, '$1. ');
  
  // 步骤 4: 处理特殊字符
  // 将括号和引号规范化
  processed = processed.replace(/[uff08uff09]/g, (match) => match === 'uff08' ? '(' : ')');
  processed = processed.replace(/[u201cu201d]/g, '"');
  
  // 步骤 5: 处理标题和选项的空白符号（如 "( )"）
  processed = processed.replace(/\(\s*\)/g, '( )');
  
  console.log('预处理后的 PDF 文本长度:', processed.length);
  return processed;
}

/**
 * 从文件中读取 PDF 文本并提取可能的题目块
 * @param filePath PDF 文件路径
 * @returns 可能的题目块数组
 */
export async function extractTextFromPdfFile(filePath: string): Promise<string[]> {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    console.log('读取 PDF 文件:', filePath);
    const buffer = await readFile(filePath);
    console.log('读取 PDF 文件成功，大小:', buffer.length, 'bytes');
    
    const text = await extractTextFromPdf(buffer);
    const processedText = preprocessPdfText(text);
    const questionBlocks = extractPossibleQuestionBlocks(processedText);
    
    return questionBlocks;
  } catch (error) {
    console.error('读取 PDF 文件错误:', error);
    throw new Error(`无法读取 PDF 文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}