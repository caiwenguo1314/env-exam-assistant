-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER,
    "chapter" TEXT,
    "tags" TEXT,
    "examId" INTEGER NOT NULL,
    "hasChart" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("answer", "chapter", "content", "difficulty", "examId", "explanation", "id", "options", "tags", "type") SELECT "answer", "chapter", "content", "difficulty", "examId", "explanation", "id", "options", "tags", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
