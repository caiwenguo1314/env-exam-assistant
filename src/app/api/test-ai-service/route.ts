import { NextRequest, NextResponse } from 'next/server';
import { extractQuestionsWithAI } from '@/lib/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    // u83b7u53d6u8bf7u6c42u4f53
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'u7f3au5c11u5fc5u8981u53c2u6570' },
        { status: 400 }
      );
    }

    console.log('u6d4bu8bd5 AI u670du52a1uff0cu63a5u6536u5230u7684u6587u672cu957fu5ea6:', text.length);
    console.log('u6587u672cu524d200u4e2au5b57u7b26:', text.substring(0, 200));

    // u8c03u7528 AI u670du52a1u63d0u53d6u9898u76ee
    const questions = await extractQuestionsWithAI(text);

    // u8fd4u56deu7ed3u679cuff0cu5305u542bu539fu59cbu6587u672cu548cu63d0u53d6u7684u9898u76ee
    return NextResponse.json({
      inputText: text,
      questions: questions,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error('u6d4bu8bd5 AI u670du52a1u51fau9519:', error);
    return NextResponse.json(
      { error: 'u670du52a1u5668u9519u8bef', details: error instanceof Error ? error.message : 'u672au77e5u9519u8bef' },
      { status: 500 }
    );
  }
}
