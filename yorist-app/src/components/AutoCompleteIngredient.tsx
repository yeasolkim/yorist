'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RecipeIngredient } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AutoCompleteIngredientProps {
  value: RecipeIngredient;
  onChange: (ingredient: RecipeIngredient) => void;
  placeholder?: string;
  className?: string;
  showFavoritesOnly?: boolean; // 즐겨찾기 재료만 표시할지 여부
}

interface IngredientSuggestion {
  id: string;
  name: string;
  unit: string;
  shop_url?: string;
  is_favorite?: boolean;
}

export default function AutoCompleteIngredient({ 
  value, 
  onChange, 
  placeholder = "재료명을 입력하세요",
  className = "",
  showFavoritesOnly = false
}: AutoCompleteIngredientProps) {
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value.name);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 재료명 검색 및 자동완성
  useEffect(() => {
    const searchIngredients = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        let query = supabase
          .from('ingredients_master')
          .select('id, name, unit, shop_url, is_favorite')
          .ilike('name', `%${searchTerm}%`);
        
        // 즐겨찾기만 표시하는 경우 필터 추가
        if (showFavoritesOnly) {
          query = query.eq('is_favorite', true);
        }
        
        const { data, error } = await query
          .order('is_favorite', { ascending: false }) // 즐겨찾기 재료를 먼저 표시
          .order('name', { ascending: true })
          .limit(10);

        if (error) {
          console.error('재료 검색 실패:', error);
          setSuggestions([]);
        } else {
          // 중복 제거 (같은 이름의 재료가 여러 개 있을 경우 첫 번째만 사용)
          const uniqueSuggestions = (data || []).reduce((acc: IngredientSuggestion[], current) => {
            const exists = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, []);
          
          setSuggestions(uniqueSuggestions);
          setShowDropdown(uniqueSuggestions.length > 0);
        }
      } catch (error) {
        console.error('재료 검색 중 오류:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    // 디바운싱 (300ms 지연)
    const timeoutId = setTimeout(searchIngredients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 재료 선택 핸들러
  const handleSuggestionClick = (suggestion: IngredientSuggestion) => {
    const updatedIngredient: RecipeIngredient = {
      ingredient_id: suggestion.id,
      name: suggestion.name,
      amount: value.amount, // 기존 수량 유지
      unit: suggestion.unit || value.unit || '개',
      shop_url: suggestion.shop_url || value.shop_url
    };

    onChange(updatedIngredient);
    setSearchTerm(suggestion.name);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  // 입력값 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setSearchTerm(newName);
    
    // 입력값이 변경되면 ingredient_id를 초기화 (새 재료로 간주)
    if (newName !== value.name) {
      const updatedIngredient: RecipeIngredient = {
        ...value,
        name: newName,
        ingredient_id: '' // 새 재료로 간주하여 ingredient_id 초기화
      };
      onChange(updatedIngredient);
    }
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // 키보드 네비게이션 구현 (필요시 추가)
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 재료명 입력 필드 */}
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-[#232323] border border-[#333] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200"
      />

      {/* 자동완성 드롭다운 */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#181818] border border-[#333] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-gray-400 text-center">
              검색 중...
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#232323] transition-colors duration-150 flex items-center justify-between ${
                    index === 0 ? 'rounded-t-xl' : ''
                  } ${
                    index === suggestions.length - 1 ? 'rounded-b-xl' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">
                      {suggestion.name}
                    </span>
                    {suggestion.is_favorite && (
                      <span className="text-orange-400 text-sm">★</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {suggestion.unit}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="px-4 py-3 text-gray-400 text-center">
              일치하는 재료가 없습니다
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 