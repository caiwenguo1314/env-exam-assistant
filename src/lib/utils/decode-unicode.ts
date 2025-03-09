/**
 * 解码 Unicode 转义序列
 * 例如将 "\u4e2d\u56fd" 转换为 "中国"
 */
export function decodeUnicode(str: string): string {
  if (!str) return '';
  
  try {
    // 处理 Unicode 转义序列
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  } catch (error) {
    console.error('Unicode 解码错误:', error);
    return str;
  }
}

/**
 * 解码 HTML 实体
 * 例如将 "&lt;div&gt;" 转换为 "<div>"
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  
  try {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };
    
    return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (match) => {
      return entities[match];
    });
  } catch (error) {
    console.error('HTML 实体解码错误:', error);
    return str;
  }
}

/**
 * 确保中文字符正确显示
 * 组合多个解码方法处理字符串
 */
export function ensureChineseDisplay(str: string): string {
  if (!str) return '';
  
  try {
    // 首先解码 Unicode
    let result = decodeUnicode(str);
    // 然后解码 HTML 实体
    result = decodeHtmlEntities(result);
    // 移除多余的转义反斜杠
    result = result.replace(/\\([^u])/g, '$1');
    
    return result;
  } catch (error) {
    console.error('中文显示处理错误:', error);
    return str;
  }
}

/**
 * 解析包含中文字符的 JSON 字符串
 */
export function parseJsonWithChineseChars(jsonStr: string): any {
  if (!jsonStr) return [];
  
  try {
    console.log('开始解析 AI 返回的文本，长度:', jsonStr.length);
    
    // 记录一些关键数字以便于调试
    const containsQuestion = jsonStr.includes('"type"') && jsonStr.includes('"content"') && jsonStr.includes('"options"');
    console.log('文本是否包含题目对象标志:', containsQuestion);
    console.log('文本中"type"出现次数:', (jsonStr.match(/"type"/g) || []).length);
    console.log('文本中"content"出现次数:', (jsonStr.match(/"content"/g) || []).length);
    console.log('文本中"options"出现次数:', (jsonStr.match(/"options"/g) || []).length);
    
    // 尝试将字符串解析为 JSON
    try {
      // 尝试直接解析返回的字符串
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('直接解析 JSON 失败，尝试提取 JSON 部分...');
        // 记录尝试的方法
        console.log('尝试方法 1: 提取方括号之间的内容');
      }

      // 尝试提取方括号之间的内容 - 通常 AI 返回的 JSON 会被包含在方括号中
      const bracketMatch = jsonStr.match(/\[([\s\S]*?)\]/m);
      if (bracketMatch && bracketMatch[0]) {
        try {
          return JSON.parse(bracketMatch[0]);
        } catch (e) {
          console.log('提取方括号内容解析失败:', e.message);
          console.log('尝试方法 2: 使用正则表达式提取对象数组');
        }
      }

      // 使用正则表达式提取对象数组
      // 这种方法可能会匹配到 JSON 中包含的所有对象
      const objectsStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');
      const objectsMatch = objectsStr.match(/\[\s*\{([\s\S]*?)\}\s*\]/g);
      if (objectsMatch && objectsMatch[0]) {
        try {
          return JSON.parse(objectsMatch[0]);
        } catch (e) {
          console.log('提取对象数组解析失败:', e.message);
          console.log('尝试方法 3: 提取所有对象并手动构建数组');
        }
      }

      // 尝试提取所有对象并手动构建数组
      const objectRegex = /\{([^{}]|\{[^{}]*\})*\}/g;
      const objects = [];
      let match;
      while ((match = objectRegex.exec(jsonStr)) !== null) {
        try {
          const obj = JSON.parse(match[0]);
          objects.push(obj);
        } catch (e) {
          console.log(`解析对象 ${match[0].substring(0, 30)}... 失败:`, e.message);
        }
      }

      if (objects.length > 0) {
        console.log(`成功手动提取了 ${objects.length} 个对象`);
        return objects;
      }

      // 进行更激进的尝试 - 如果没有直接读取到完整 JSON，尝试正则匹配提取 type/content/options 特征
      console.log('尝试方法 4: 正则匹配提取题目特征');
      const questionsFromRegex = extractQuestionsWithRegex(jsonStr);
      if (questionsFromRegex.length > 0) {
        console.log(`通过正则表达式找到 ${questionsFromRegex.length} 个题目`);
        return questionsFromRegex;
      }
      
      // 如果所有方法都失败了，返回一个简单的对象数组，至少不会导致程序崩溃
      console.log('所有解析方法都失败了，返回最小化题目对象');
      return [
        {
          type: "单选题",
          content: "无法解析题目内容，请检查 AI 返回格式",
          options: ["A. 选项A", "B. 选项B"],
          answer: "",
          explanation: "",
          category: "其他"
        }
      ];
    } catch (error) {
      console.error('解析 JSON 失败:', error);
      // 返回示例题目
      return [{
        type: '单选题',
        content: '无法正确解析AI返回的内容',
        options: ['A. 选项A', 'B. 选项B'],
        answer: 'A',
        explanation: '',
        category: '解析失败'
      }];
    }
  } catch (error) {
    console.error('解析 JSON 失败:', error);
    // 返回示例题目
    return [{
      type: '单选题',
      content: '无法正确解析AI返回的内容',
      options: ['A. 选项A', 'B. 选项B'],
      answer: 'A',
      explanation: '',
      category: '解析失败'
    }];
  }
}

// 使用正则表达式提取题目特征
function extractQuestionsWithRegex(text) {
  const questions = [];
  
  // 查找类似题目模式，如 "type": "单选题", "content": "题目内容"
  const typeRegex = /"type"\s*:\s*"([^"]+)"/g;
  const contentRegex = /"content"\s*:\s*"([^"]+)"/g;
  const optionsRegex = /"options"\s*:\s*\[(.*?)\]/g;
  
  // 收集所有可能的题目类型
  const types = [];
  let typeMatch;
  while ((typeMatch = typeRegex.exec(text)) !== null) {
    types.push({
      type: typeMatch[1],
      index: typeMatch.index
    });
  }
  
  // 收集所有可能的题目内容
  const contents = [];
  let contentMatch;
  while ((contentMatch = contentRegex.exec(text)) !== null) {
    contents.push({
      content: contentMatch[1],
      index: contentMatch.index
    });
  }
  
  // 收集所有可能的选项
  const options = [];
  let optionsMatch;
  while ((optionsMatch = optionsRegex.exec(text)) !== null) {
    // 尝试解析选项数组
    try {
      const optionsArray = JSON.parse(`[${optionsMatch[1]}]`);
      options.push({
        options: optionsArray,
        index: optionsMatch.index
      });
    } catch (e) {
      // 如果解析失败，尝试使用正则表达式提取选项
      const optionItems = optionsMatch[1].match(/"[^"]+"/g);
      if (optionItems) {
        options.push({
          options: optionItems.map(item => item.replace(/"/g, '')),
          index: optionsMatch.index
        });
      }
    }
  }
  
  // 将找到的类型、内容和选项按位置组合成题目
  // 根据它们在文本中的索引位置进行匹配
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    
    // 找到最近的内容
    let closestContent = null;
    let minContentDistance = Infinity;
    for (const content of contents) {
      const distance = Math.abs(content.index - type.index);
      if (distance < minContentDistance) {
        minContentDistance = distance;
        closestContent = content;
      }
    }
    
    // 找到最近的选项
    let closestOptions = null;
    let minOptionsDistance = Infinity;
    for (const option of options) {
      const distance = Math.abs(option.index - type.index);
      if (distance < minOptionsDistance) {
        minOptionsDistance = distance;
        closestOptions = option;
      }
    }
    
    // 如果找到了内容，创建题目对象
    if (closestContent) {
      questions.push({
        type: type.type,
        content: closestContent.content,
        options: closestOptions ? closestOptions.options : [],
        answer: "",
        explanation: "",
        category: "其他"
      });
    }
  }
  
  // 如果通过类型匹配不到足够的题目，尝试通过内容匹配
  if (questions.length === 0 && contents.length > 0) {
    for (const content of contents) {
      // 创建一个基本的题目对象
      questions.push({
        type: "未知",
        content: content.content,
        options: [],
        answer: "",
        explanation: "",
        category: "其他"
      });
    }
  }
  
  console.log(`正则表达式提取: 找到 ${types.length} 个类型, ${contents.length} 个内容, ${options.length} 个选项集`);
  console.log(`组合后共 ${questions.length} 个题目`);
  
  return questions;
}

/**
 * 递归解码对象中的所有字符串属性
 */
export function decodeObjectStrings(obj: any): any {
  if (!obj) return obj;
  
  // 如果是字符串，直接解码
  if (typeof obj === 'string') {
    return ensureChineseDisplay(obj);
  }
  
  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => decodeObjectStrings(item));
  }
  
  // 如果是对象，递归处理每个属性
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // 解码键名和值
        const decodedKey = ensureChineseDisplay(key);
        result[decodedKey] = decodeObjectStrings(obj[key]);
      }
    }
    return result;
  }
  
  // 其他类型直接返回
  return obj;
}
