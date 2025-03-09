'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
  const pathname = usePathname();

  const navItems = [
    { name: '首页', path: '/' },
    { name: '上传试卷', path: '/exams/upload' },
    { name: '我的试卷', path: '/exams' },
    { name: '练习记录', path: '/records' },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary-600">
              环评师考试助手
            </Link>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.path || 
                (item.path !== '/' && pathname.startsWith(item.path));
                
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${isActive ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-500'} transition-colors`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          <div className="md:hidden">
            {/* 移动端菜单按钮 */}
            <button className="text-gray-600 hover:text-primary-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
