import { NextResponse } from 'next/server';
import { extractQuestionsWithAI } from '@/lib/services/ai-service';
import { decodeObjectStrings, parseJsonWithChineseChars, ensureChineseDisplay } from '@/lib/utils/decode-unicode';

// u6d4bu8bd5 AI u670du52a1u7684u63a5u53e3
export async function GET() {
  try {
    // u6d4bu8bd5u6587u672c
    const testText = `
      1. u4e0bu5217u5173u4e8eu73afu5883u5f71u54cdu8bc4u4ef7u5236u5ea6u7684u8bf4u6cd5u4e2duff0cu9519u8befu7684u662fuff08 uff09u3002
      A. u73afu5883u5f71u54cdu8bc4u4ef7u662fu4e00u79cdu4e8bu524du9884u9632u6027u7684u73afu5883u7ba1u7406u5236u5ea6
      B. u73afu5883u5f71u54cdu8bc4u4ef7u662fu5bf9u89c4u5212u548cu5efau8bbeu9879u76eeu5b9eu65bdu540eu53efu80fdu9020u6210u7684u73afu5883u5f71u54cdu8fdbu884cu5206u6790u3001u9884u6d4bu548cu8bc4u4ef7
      C. u73afu5883u5f71u54cdu8bc4u4ef7u5236u5ea6u662fu6211u56fdu73afu5883u4fddu62a4u7684u57fau672cu5236u5ea6
      D. u73afu5883u5f71u54cdu8bc4u4ef7u5236u5ea6u662fu5728u9879u76eeu51b3u7b56u9636u6bb5u4e2du5f15u5165u73afu5883u4fddu62a4u5de5u4f5cu7684u6709u6548u63aau65bd
      
      2. u4e0bu5217u5173u4e8eu73afu5883u5f71u54cdu8bc4u4ef7u7684u8bf4u6cd5u4e2duff0cu6b63u786eu7684u662fuff08 uff09u3002
      A. u73afu5883u5f71u54cdu8bc4u4ef7u662fu5bf9u5df2u7ecfu5b58u5728u7684u73afu5883u95eeu9898u8fdbu884cu8bc4u4ef7
      B. u73afu5883u5f71u54cdu8bc4u4ef7u662fu5bf9u5efau8bbeu9879u76eeu5b9eu65bdu540eu7684u73afu5883u72b6u51b5u8fdbu884cu76d1u6d4b
      C. u73afu5883u5f71u54cdu8bc4u4ef7u662fu5bf9u5efau8bbeu9879u76eeu5b9eu65bdu8fc7u7a0bu4e2du7684u73afu5883u72b6u51b5u8fdbu884cu76d1u6d4b
      D. u73afu5883u5f71u54cdu8bc4u4ef7u662fu5bf9u5efau8bbeu9879u76eeu5b9eu65bdu540eu53efu80fdu9020u6210u7684u73afu5883u5f71u54cdu8fdbu884cu5206u6790u3001u9884u6d4bu548cu8bc4u4ef7
    `;

    // u8c03u7528 AI u670du52a1u63d0u53d6u9898u76ee
    console.log('u5f00u59cbu6d4bu8bd5 AI u670du52a1...');
    const questions = await extractQuestionsWithAI(testText);
    
    // u5c06u54cdu5e94u8f6cu6362u4e3a JSON u5b57u7b26u4e32uff0cu7136u540eu89e3u7801u5e76u91cdu65b0u89e3u6790
    const jsonString = JSON.stringify(questions);
    console.log('u539fu59cb JSON u5b57u7b26u4e32u957fu5ea6:', jsonString.length);
    
    // u4f7fu7528u589eu5f3au7684u89e3u7801u65b9u6cd5
    const decodedQuestions = decodeObjectStrings(questions);
    console.log('u89e3u7801u540eu7684u9898u76eeu6570u91cf:', decodedQuestions.length);
    
    // u5c1du8bd5u5bf9u9898u76eeu5185u5bb9u8fdbu884cu989du5916u5904u7406
    const enhancedQuestions = decodedQuestions.map(q => ({
      ...q,
      content: ensureChineseDisplay(q.content),
      options: q.options ? q.options.map(opt => ensureChineseDisplay(opt)) : [],
      explanation: q.explanation ? ensureChineseDisplay(q.explanation) : null
    }));
    
    // u8fd4u56deu7ed3u679c
    return NextResponse.json({
      success: true,
      questions: enhancedQuestions,
      originalJson: jsonString.substring(0, 100) + '...', // u8fd4u56deu90e8u5206u539fu59cb JSON u4ee5u4fbfu8c03u8bd5
    });
  } catch (error) {
    console.error('u6d4bu8bd5 AI u670du52a1u5931u8d25:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'u672au77e5u9519u8bef' },
      { status: 500 }
    );
  }
}
