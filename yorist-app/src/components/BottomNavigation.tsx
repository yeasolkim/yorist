import { NavigationTab } from '@/lib/types';
import { useEffect, useState } from 'react';

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export default function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  // 네비게이션 탭 설정 (id와 label을 UI와 일치시킴)
  const tabs = [
    {
      id: 'home' as NavigationTab,
      label: '홈',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'recipebook' as NavigationTab,
      label: '레시피북',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13M4 19.5V21a1 1 0 001 1h13.5a2.5 2.5 0 002.5-2.5V6.5" />
        </svg>
      )
    },
    {
      id: 'search' as NavigationTab,
      label: '검색',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'favorites' as NavigationTab,
      label: '즐겨찾기',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    }
  ];

  const handleTabClick = (tab: NavigationTab) => {
    onTabChange(tab);
  };
  
  return (
    // 하단 네비게이션 배경을 완전 투명하게 변경
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-transparent border-t border-[#2a2a2a] px-2 sm:px-4 pb-2 sm:pb-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-12 sm:h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ease-out relative group min-h-[36px] sm:min-h-[44px] ${
                isActive 
                  ? 'text-orange-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              aria-label={tab.label}
            >
              {/* 활성 상태 배경 */}
              {isActive && (
                <div className="absolute inset-0 bg-orange-400/10 rounded-xl -m-1 animate-scaleIn" />
              )}
              
              <div className="relative flex items-center justify-center mb-0.5 sm:mb-1">
                <div className={`transition-all duration-300 ease-out ${
                  isActive ? 'scale-105 sm:scale-110' : 'group-hover:scale-105'
                }`}>
                  {tab.icon}
                </div>
              </div>
              
              <span className={`text-[10px] sm:text-xs font-medium tracking-tight transition-all duration-300 ease-out ${
                isActive ? 'text-orange-400' : 'text-gray-400 group-hover:text-gray-300'
              }`}>
                {tab.label}
              </span>
              
              {/* 활성 상태 인디케이터 */}
              {isActive && (
                <div className="absolute bottom-0 w-1 h-1 bg-orange-400 rounded-full animate-scaleIn" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
} 