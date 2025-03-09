import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary-600">
          环评师考试助手
        </Link>
        
        <nav className="flex space-x-6">
          <Link href="/exams" className="text-gray-600 hover:text-primary-600">
            试卷管理
          </Link>
          <Link href="/questions" className="text-gray-600 hover:text-primary-600">
            题库管理
          </Link>
          <Link href="/papers" className="text-gray-600 hover:text-primary-600">
            组卷练习
          </Link>
          <Link href="/practice" className="text-gray-600 hover:text-primary-600">
            在线答题
          </Link>
        </nav>
      </div>
    </header>
  );
}