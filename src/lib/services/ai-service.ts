import axios from "axios";
import {
  decodeObjectStrings,
  parseJsonWithChineseChars,
  ensureChineseDisplay,
} from "@/lib/utils/decode-unicode";

// Gemini API 配置
const API_URL = process.env.GEMINI_API_URL;
const API_KEY = process.env.GEMINI_API_KEY;
const MAX_RETRIES = 3; // 最大重试次数

/**
 * 使用 Gemini AI 从文本中提取题目
 * @param text PDF 文本内容
 * @returns 提取的题目数组
 */
export async function extractQuestionsWithAI(
  text: string,
  retryCount = 0
): Promise<Question[]> {
  console.log(`调用 Gemini API 提取题目 (尝试 ${retryCount + 1}/4)`);

  // 最大重试次数为 3 次
  const maxRetries = 3;

  try {
    // 检查 API 配置
    if (!API_URL || !API_KEY) {
      console.error("错误: Gemini API 环境变量未设置");
      return getExampleQuestions();
    }

    // 准备提示词
    const prompt = `
      你是一个专业的环评师考试题目提取助手。请从以下文本中提取所有考试题目，并按照指定格式输出。

      请仔细分析文本，找出所有可能的题目。题目格式多样，可能包含如下形式：
      1. 常规题目：通常包含题号（如1、2、3或一、二、三等）和选项（如A、B、C、D）
      2. 图表题目：包含表格、图形或其他视觉元素的题目（在文本中可能表现为特殊格式或描述）
      3. 参考答案页：可能单独列出所有题目的答案（如"练习1（不定项）：ABC"这样的格式）

      【非常重要】: 这个文本仅仅是整个PDF的一部分，可能只包含部分题目或者只包含答案。请只提取你在这一段能看到的内容，不要担心题目是否完整或编号是否连续，我们会从多段文本中合并所有信息。
        答案分布有两种情况，一种是在题目后面，一种是在文本最后单独列出，答案与题目是通过题目最开始类似于2021-31，或者练习1等信息匹配的。需要你对此进行判断，并为每道题匹配答案。
        有的题的编号是2007改编（不定项），有的是2007（不定项）这是两道题，需要分别提取。
      # 提取规则
      对于每个题目或答案，请提取以下可获得的信息：
      1. 题目编号（如"2022-7"、"练习1"等任何形式的编号）
      2. 题目类型（单选题、多选题、不定项等）
      3. 题目内容
      4. 选项（如果有）
      5. 正确答案（如果能找到）
      6. 解析（如果有）
      7. 图表描述（如果题目包含表格或图形，请提供详细描述）
      8. 答案描述：类似"练习29（不定项）:ACD"的格式，答案不需要按题来提取出来 
      

       # 答案匹配规则
      如果文本是参考答案页：
      1. 正确提取每个答案的编号和对应答案（如"练习1（不定项）：ABC"）
      2. 如果答案页包含题目类型（如不定项、单选等），也请提取
      3. 即使没有对应的题目内容，也请提取答案信息

      【输出格式】
      输出必须是带有编码且有效的严格的JSON数组格式，例如：
      [
        {
          "id": 1,
          "type": "单选题",
          "content": "保留类似2022-7或者练习1等的编号+题目内容" ,
          "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"],
          "answer": "A",
          "explanation": "解析内容",
          "category": "大气污染防治",
          "hasChart": false // 是否包含图表
        },
        {
          "id": 2,
          "type": "不定项",
          "content": "", // 内容可能为空
          "options": [], // 选项可能为空
          "answer": "ABC", // 只有答案信息
          "hasChart": false
        }
      ]

      【注意事项】
      1. 不要在输出外添加任何注释
      2. 不要在JSON前后添加附加文本
      3. 对于实在无法解析的内容，尝试提取尽可能多的有效信息
      4. 对于包含图表的题目，特别标注hasChart字段为true
      5. 保留题目的原始编号格式，不要统一转换
      6. 【重要】提取题目时，必须完整保留题目前面的标识符（如"1."、"二."等），以便与答案匹配

      以下是需要提取题目的文本片段：
    `;

    // 删除文本限制，已经在外层分块处理
    const fullPrompt = `${prompt}\n${text}`;

    // 记录文本长度和前200个字符
    console.log("发送给 AI 的文本长度:", text.length);
    console.log("文本前200个字符示例:", text.substring(0, 200));
    console.log("API URL:", API_URL);
    console.log("API KEY 长度:", API_KEY.length);
    console.log("发送请求到 Gemini API");

    // 准备请求数据 - 使用正确的模型名称
    const requestData = {
      model: "gemini-2.0-flash-exp", // 修改为使用 gemini-2.0-flash-exp 模型
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.3,
      max_tokens: 4000,
    };

    console.log("请求数据结构:", Object.keys(requestData));

    // 发送请求到 Gemini API
    const response = await axios.post(API_URL, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      timeout: 100000, // 增加超时时间
    });

    // 收到 Gemini API 响应后立即打印完整数据
    console.log("收到 Gemini API 响应，状态码:", response.status);
    console.log("响应数据结构:", Object.keys(response.data));

    // 打印完整的AI原始响应数据
    console.log("========== AI 完整原始响应开始 ==========");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("========== AI 完整原始响应结束 ==========");

    // 尝试从不同格式的响应中提取内容
    let content: string = "";

    try {
      // 输出完整的响应内容，便于调试
      console.log(
        "完整API响应结构:",
        JSON.stringify(response.data).substring(0, 300) + "..."
      );

      if (response.data.choices && response.data.choices.length > 0) {
        console.log("检测到 OpenAI 格式响应");
        if (
          response.data.choices[0].message &&
          response.data.choices[0].message.content
        ) {
          content = response.data.choices[0].message.content;
          console.log("从 OpenAI 格式中提取内容，内容长度:", content.length);
          // 从code block中提取内容
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            content = codeBlockMatch[1].trim();
            console.log("从代码块中提取JSON内容，长度:", content.length);
          }
        } else if (response.data.choices[0].text) {
          content = response.data.choices[0].text;
          console.log("从 OpenAI 旧格式中提取内容");
          // 同样检查是否有代码块
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            content = codeBlockMatch[1].trim();
            console.log("从代码块中提取JSON内容，长度:", content.length);
          }
        }
      } else if (
        response.data.candidates &&
        response.data.candidates.length > 0
      ) {
        // Gemini 格式
        if (
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts
        ) {
          content = response.data.candidates[0].content.parts[0].text;
          console.log("从 Gemini 格式中提取内容, 内容长度:", content.length);
          // 从code block中提取内容
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            content = codeBlockMatch[1].trim();
            console.log("从代码块中提取JSON内容，长度:", content.length);
          }
        } else if (response.data.candidates[0].text) {
          content = response.data.candidates[0].text;
          console.log("从 Gemini 旧格式中提取内容");
          // 同样检查是否有代码块
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            content = codeBlockMatch[1].trim();
            console.log("从代码块中提取JSON内容，长度:", content.length);
          }
        }
      }

      // 尝试查找整个响应中的JSON数组
      if (!content) {
        // 尝试从整个响应中查找JSON数组
        console.log("尝试从整个响应中查找JSON数组");
        const responseStr = JSON.stringify(response.data);
        const jsonArrayMatch = responseStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (jsonArrayMatch) {
          content = jsonArrayMatch[0];
          console.log("找到JSON数组，长度:", content.length);
        }
      }

      // 如果仍然没有内容，尝试直接返回整个响应
      if (!content) {
        console.log("未能提取到内容，尝试使用整个响应");
        content = JSON.stringify(response.data);
      }

      // 如果内容为空，使用parseJsonWithChineseChars中的备用机制解析
      if (!content) {
        console.log("警告: 无法从API响应中提取内容，将使用备用机制");
        // 不抛出错误，让后续的parseJsonWithChineseChars处理
        content =
          '{"type":"单选题","content":"无法正确解析内容","options":["A. 选项A","B. 选项B"],"answer":"A","explanation":"","category":"解析失败"}';
      }
    } catch (contentError) {
      console.error("从 AI 响应中提取内容失败", contentError);
      return getExampleQuestions();
    }

    // 使用自定义的 JSON 解析函数
    let questions = parseJsonWithChineseChars(content);

    // 检查解析结果
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.log(
        "无法解析 API 响应为有效的 JSON 数组，直接解析失败，尝试提取 JSON 部分"
      );

      // 尝试提取 JSON 部分
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        console.log(
          "提取的 JSON 片段:",
          extractedJson.substring(0, 200) + "..."
        );

        // 尝试解析提取的 JSON
        const extractedQuestions = parseJsonWithChineseChars(extractedJson);
        if (
          extractedQuestions &&
          Array.isArray(extractedQuestions) &&
          extractedQuestions.length > 0
        ) {
          console.log(`成功提取并解析了 ${extractedQuestions.length} 个题目`);
          console.log(
            "第一个题目示例:",
            JSON.stringify(extractedQuestions[0], null, 2)
          );
          questions = extractedQuestions;
        }
      }

      if (!questions || !Array.isArray(questions)) {
        console.log("无法解析 API 响应为有效的 JSON 数组，返回示例题目");
        return getExampleQuestions();
      }
    }

    // 如果解析成功
    console.log(`提取了 ${questions.length} 个题目`);
    if (questions.length > 0) {
      console.log("第一个题目示例:", JSON.stringify(questions[0], null, 2));
    }

    // 直接返回原始数据，不再进行处理
    return questions;
  } catch (error) {
    console.error("解析 API 响应时出错:", error);

    // 如果还有重试次数，重试
    if (retryCount < maxRetries) {
      console.log(`重试提取题目 (${retryCount + 2}/${maxRetries + 1})`);
      return extractQuestionsWithAI(text, retryCount + 1);
    }

    console.log("超过最大重试次数，返回示例题目");
    return getExampleQuestions();
  }
}

/**
 * 使用 Gemini AI 生成题目的解析
 * @param question 题目内容
 * @param options 选项（如果有）
 * @param answer 正确答案
 * @returns 生成的解析
 */
export async function generateExplanationWithAI(
  question: string,
  options: string[],
  answer: string,
  retryCount = 0
): Promise<string> {
  // 最大重试次数
  const maxRetries = 3;

  try {
    console.log(
      `调用 Gemini API 生成解析 (尝试 ${retryCount + 1}/${maxRetries + 1})`
    );

    // 检查环境变量
    if (!API_URL || !API_KEY) {
      console.error("Gemini API 配置缺失，请检查环境变量");
      return "环境变量未配置，无法生成解析";
    }

    const optionsText =
      options.length > 0 ? `\n选项：\n${options.join("\n")}` : "";

    const prompt = `
      请为以下环评师考试题目生成详细的解析：
      
      题目：${question}
      ${optionsText}
      正确答案：${answer}
      
      请提供详细的解析，包括为什么这个答案是正确的，以及其他选项为什么是错误的。
    `;

    // 准备请求数据
    const requestData = {
      model: "gemini-2.0-flash-exp",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    };

    console.log("发送请求到 Gemini API...");

    // 发送请求到 Gemini API
    const response = await axios.post(API_URL, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      timeout: 30000, // 30秒超时
    });

    console.log("收到 Gemini API 响应，状态码:", response.status);
    console.log("响应数据结构:", Object.keys(response.data));

    // 尝试从不同格式的响应中提取内容
    let content: string = "";

    // 检查 OpenAI 格式
    if (response.data.choices && response.data.choices.length > 0) {
      console.log("检测到 OpenAI 格式响应");
      if (
        response.data.choices[0].message &&
        response.data.choices[0].message.content
      ) {
        content = response.data.choices[0].message.content;
        console.log("从 OpenAI 格式中提取内容，内容长度:", content.length);
        // 从code block中提取内容
        const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          content = codeBlockMatch[1].trim();
          console.log("从代码块中提取JSON内容，长度:", content.length);
        }
      } else if (response.data.choices[0].text) {
        content = response.data.choices[0].text;
        console.log("从 OpenAI 旧格式中提取内容");
        // 同样检查是否有代码块
        const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          content = codeBlockMatch[1].trim();
          console.log("从代码块中提取JSON内容，长度:", content.length);
        }
      }
    }
    // 检查 Gemini 格式
    else if (response.data.candidates && response.data.candidates.length > 0) {
      if (
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts
      ) {
        content = response.data.candidates[0].content.parts[0].text;
        console.log("从 Gemini 格式中提取内容，内容长度:", content.length);
        // 从code block中提取内容
        const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          content = codeBlockMatch[1].trim();
          console.log("从代码块中提取JSON内容，长度:", content.length);
        }
      } else if (response.data.candidates[0].text) {
        content = response.data.candidates[0].text;
        console.log("从 Gemini 旧格式中提取内容");
        // 同样检查是否有代码块
        const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          content = codeBlockMatch[1].trim();
          console.log("从代码块中提取JSON内容，长度:", content.length);
        }
      }
    }

    // 尝试查找整个响应中的JSON数组
    if (!content) {
      // 尝试从整个响应中查找JSON数组
      console.log("尝试从整个响应中查找JSON数组");
      const responseStr = JSON.stringify(response.data);
      const jsonArrayMatch = responseStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonArrayMatch) {
        content = jsonArrayMatch[0];
        console.log("找到JSON数组，长度:", content.length);
      }
    }

    // 如果仍然没有内容，尝试直接返回整个响应
    if (!content) {
      console.log("未能提取到内容，尝试使用整个响应");
      content = JSON.stringify(response.data);
    }

    // 如果内容为空，使用parseJsonWithChineseChars中的备用机制解析
    if (!content) {
      console.log("警告: 无法从API响应中提取内容，将使用备用机制");
      // 不抛出错误，让后续的parseJsonWithChineseChars处理
      content =
        '{"type":"单选题","content":"无法正确解析内容","options":["A. 选项A","B. 选项B"],"answer":"A","explanation":"","category":"解析失败"}';
    }

    console.log("提取的内容长度:", content ? content.length : 0);
    if (content.length > 500) {
      console.log("内容摘要:", content.substring(0, 500) + "...");
    } else {
      console.log("完整内容:", content);
    }

    // 如果仍然没有内容，返回空数组
    if (!content) {
      console.log("警告: 即使尝试了所有方法，仍无法从响应中提取内容");
      // 不抛出错误，返回一个空数组
      return [];
    }

    console.log("提取的内容片段:", content.substring(0, 100));

    // 确保中文字符正确显示
    const explanation = ensureChineseDisplay(content);
    console.log("生成解析成功");
    return explanation;
  } catch (error) {
    console.error("生成解析错误:", error);

    // 重试
    if (retryCount < maxRetries) {
      console.log(`生成解析失败，准备第 ${retryCount + 2} 次尝试...`);
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1))
      );
      return generateExplanationWithAI(
        question,
        options,
        answer,
        retryCount + 1
      );
    }

    return `无法生成解析: ${
      error instanceof Error ? error.message : "未知错误"
    }`;
  }
}

/**
 * 获取示例题目
 * @returns 示例题目数组
 */
function getExampleQuestions(): Question[] {
  return [
    {
      type: "选择题",
      content: "不属于关联性质和强度的描述是（　　）.",
      options: [
        "A. 关联性质和强度是描述关联强度的两个基本概念",
        "B. 关联性质和强度是描述关联强度的两个基本方面",
        "C. 关联性质是描述关联强度的基本概念",
        "D. 关联强度是描述关联强度的基本方面",
      ],
      answer: "B",
      explanation:
        "解析：B 选项错误。关联性质和强度是描述关联强度的两个基本方面，不是基本概念。",
    },
  ];
}

// ... 其他的函数和代码保持不变 ...
