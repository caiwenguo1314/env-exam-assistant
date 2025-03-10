import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { examId, questions } = await request.json();

    if (!examId || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'u65e0u6548u7684u8bf7u6c42u53c2u6570' },
        { status: 400 }
      );
    }

    console.log(`u51c6u5907u4fddu5b58 ${questions.length} u4e2au9898u76eeu5230u6570u636eu5e93`);

    // u4fddu5b58u9898u76ee
    let savedCount = 0;
    const savedQuestions = [];

    for (const q of questions) {
      try {
        // u5904u7406u9009u9879 - u786eu4fddu5b83u662fJSONu5b57u7b26u4e32
        let optionsJson;
        if (Array.isArray(q.options)) {
          optionsJson = JSON.stringify(q.options);
        } else if (typeof q.options === 'string') {
          // u68c0u67e5u662fu5426u5df2u7ecfu662fJSONu5b57u7b26u4e32
          try {
            JSON.parse(q.options);
            optionsJson = q.options;
          } catch {
            optionsJson = JSON.stringify([q.options]);
          }
        } else {
          optionsJson = JSON.stringify([]);
        }

        // u51c6u5907u9898u76eeu6570u636e
        const questionData = {
          examId,
          content: q.content || '',
          type: q.type || 'u5355u9009u9898',
          options: optionsJson,
          answer: q.answer || '',
          explanation: q.explanation || '',
          tags: q.category || q.tags || '',
          hasChart: Boolean(q.hasChart),
          externalId: q.id || q.externalId || '',
        };

        // u4fddu5b58u5230u6570u636eu5e93
        const savedQuestion = await prisma.question.create({
          data: questionData,
        });

        savedQuestions.push(savedQuestion);
        savedCount++;
      } catch (error) {
        console.error(`u4fddu5b58u9898u76eeu5931u8d25:`, error);
      }
    }

    console.log(`u6210u529fu4fddu5b58 ${savedCount} u4e2au9898u76eeu5230u6570u636eu5e93`);

    // u8fd4u56deu7ed3u679c
    return NextResponse.json({
      success: true,
      examId,
      savedCount,
      questions: savedQuestions
    });
    
  } catch (error) {
    console.error('u4fddu5b58u9898u76eeu5931u8d25:', error);
    return NextResponse.json(
      { error: `u4fddu5b58u9898u76eeu5931u8d25: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
