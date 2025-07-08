import React from 'react';

// 전체 화면에 반투명 배경 이미지를 표시하는 컴포넌트
const BackgroundImage: React.FC = () => (
  <div
    aria-hidden="true"
    className="fixed inset-0 w-full h-full z-0 pointer-events-none select-none"
    style={{
      backgroundImage: `url('/background.png')`, // public 폴더 기준 경로
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.15, // 반투명도 조절
      filter: 'blur(3.2px)', // 약간의 블러로 텍스트 가독성 향상
    }}
  />
);

export default BackgroundImage; 