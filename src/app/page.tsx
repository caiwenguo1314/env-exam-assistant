import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-primary-600">
          环评师考试助手
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">欢迎使用环评师考试助手</h2>
          <p className="text-gray-600 mb-4">
            本平台旨在帮助环境影响评价师考生高效备考，通过智能化的题目解析和练习系统，提高学习效率和考试通过率。
          </p>
          <div className="flex justify-center mt-6">
            <Link 
              href="/exams/upload" 
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              开始使用
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            title="上传试卷" 
            description="上传PDF格式的试卷，系统自动解析题目内容" 
            icon="📄" 
            link="/exams/upload" 
          />
          <FeatureCard 
            title="智能解析" 
            description="AI技术自动提取题目、选项和答案，无需手动录入" 
            icon="🤖" 
            link="/exams" 
          />
          <FeatureCard 
            title="练习记录" 
            description="记录做题情况，分析薄弱环节，提高备考效率" 
            icon="📊" 
            link="/records" 
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon, link }: { 
  title: string; 
  description: string; 
  icon: string; 
  link: string;
}) {
  return (
    <Link href={link} className="block">
      <div className="bg-white rounded-lg shadow-md p-6 h-full hover:shadow-lg transition-shadow">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  );
}
