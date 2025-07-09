import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 준비
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AddIngredientFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddIngredientForm({ onClose, onSuccess }: AddIngredientFormProps) {
  // 입력 상태
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 자동완성 후보 상태
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 자동완성 후보 클릭 시 입력값 자동 채움 (id까지)
  const [ingredientId, setIngredientId] = useState<string | null>(null);

  // 재료명 입력 시 자동완성 후보 검색
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (name.trim().length < 1) {
        setSuggestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('ingredients_master')
        .select('id, name, unit, shop_url')
        .ilike('name', `%${name.trim()}%`)
        .limit(7);
      if (!error && data) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [name]);

  // 자동완성 후보 클릭 시 입력값 자동 채움 (id까지)
  const handleSuggestionClick = (item: any) => {
    setName(item.name);
    setUnit(item.unit || '');
    setShopUrl(item.shop_url || '');
    setIngredientId(item.id || null); // id 세팅
    setShowSuggestions(false);
    inputRef.current?.blur();
  };
  // 입력값이 바뀌면 id 초기화
  useEffect(() => { setIngredientId(null); }, [name]);

  // 입력창 포커스/블러로 드롭다운 표시 제어
  const handleFocus = () => setShowSuggestions(true);
  const handleBlur = () => setTimeout(() => setShowSuggestions(false), 120);

  // 재료 추가/업데이트 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError('재료명을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      let finalId = ingredientId;
      // ingredientId가 없으면 name으로 DB에서 id 조회 (ilike)
      if (!finalId) {
        const { data: existing, error: fetchError } = await supabase
          .from('ingredients_master')
          .select('id')
          .ilike('name', name.trim())
          .single();
        if (existing && existing.id) {
          finalId = existing.id;
        }
      }
      if (finalId) {
        // id가 있으면 update
        const { error: updateError } = await supabase
          .from('ingredients_master')
          .update({
            unit: unit.trim(),
            shop_url: shopUrl.trim() || null
          })
          .eq('id', finalId);
        if (updateError) throw updateError;
        setMessage('기존 재료 정보를 업데이트했습니다.');
      } else {
        // id가 없으면 insert
        const { error: insertError } = await supabase
          .from('ingredients_master')
          .insert({
            name: name.trim(),
            unit: unit.trim() || '개',
            shop_url: shopUrl.trim() || null,
            is_favorite: 'false'
          });
        if (insertError) throw insertError;
        setMessage('재료가 성공적으로 추가되었습니다.');
      }
      setName(''); setUnit(''); setShopUrl(''); setIngredientId(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError('재료 추가/업데이트 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-6 my-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-3 sm:p-6 animate-slideIn">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white">재료 추가</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
          <div className="space-y-2 sm:space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">재료명 *</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  ref={inputRef}
                  placeholder="예: 올리브 오일"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px] text-base sm:text-lg"
                  required
                />
                {/* 자동완성 드롭다운 */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 z-50 bg-[#232323] border border-[#333] rounded-xl mt-1 shadow-lg max-h-56 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                      <li
                        key={item.name + idx}
                        className="px-4 py-2 text-white cursor-pointer hover:bg-orange-500/80 transition-all"
                        onMouseDown={() => handleSuggestionClick(item)}
                      >
                        <span className="font-semibold">{item.name}</span>
                        {item.unit && <span className="text-xs text-gray-400 ml-2">({item.unit})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <label className="block text-white font-medium mb-2">단위</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="예: 개, g, ml 등"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px] text-base sm:text-lg"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">쇼핑링크</label>
              <input
                type="text"
                value={shopUrl}
                onChange={e => setShopUrl(e.target.value)}
                placeholder="구매 가능한 URL (선택)"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px] text-base sm:text-lg"
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm font-medium mt-2">{error}</div>}
          {message && <div className="text-orange-400 text-sm font-medium mt-2">{message}</div>}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#3a2a3a] text-white rounded-xl py-3 font-medium transition-colors text-base sm:text-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl py-3 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 text-base sm:text-lg"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 