import React from 'react';
import './CookingLoader.css';

// 심플하고 세련된 요리 로딩 컴포넌트
const CookingLoader = () => (
  <div className="cooking-loader-container">
    {/* 메인 스피너 */}
    <div className="cooking-loader-spinner">
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
    </div>
    
    {/* 중앙 아이콘 */}
    <div className="cooking-loader-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" 
          fill="currentColor"
          className="cooking-loader-star"
        />
      </svg>
    </div>
    
    {/* 로딩 텍스트 */}
    <div className="cooking-loader-text">
      <span className="text-primary">레시피</span> 생성 중...
    </div>
  </div>
);

export default CookingLoader; 