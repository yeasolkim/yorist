"use client";
import YoristHeader from '@/components/YoristHeader';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Recipe, RecipeStep, RecipeIngredient } from '@/lib/types';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import { recipeService, toDbIngredients } from '@/lib/supabase';
import Link from 'next/link';
import { getYouTubeVideoId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/lib/youtubeUtils';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/lib/supabase';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import { useIngredientSync, triggerIngredientSync } from '@/lib/ingredientSync';

// 안정적인 동기화를 위한 상태 관리 클래스
class StableSyncManager {
  private pendingUpdates = new Set<string>();
  private lastUpdateTime = 0;
  private readonly DEBOUNCE_DELAY = 2000; // 2초로 증가
  private updateQueue: Array<{ type: string; timestamp: number }> = [];
  private isProcessing = false;

  // 업데이트가 진행 중인지 확인
  isUpdating(type: string): boolean {
    return this.pendingUpdates.has(type);
  }

  // 업데이트 시작
  startUpdate(type: string): void {
    this.pendingUpdates.add(type);
    this.lastUpdateTime = Date.now();
    this.updateQueue.push({ type, timestamp: Date.now() });
    console.log(`[SyncManager] 업데이트 시작: ${type}`);
  }

  // 업데이트 완료
  finishUpdate(type: string): void {
    this.pendingUpdates.delete(type);
    this.updateQueue = this.updateQueue.filter(update => update.type !== type);
    console.log(`[SyncManager] 업데이트 완료: ${type}`);
  }

  // 모든 업데이트가 완료되었는지 확인
  isAllUpdatesComplete(): boolean {
    return this.pendingUpdates.size === 0;
  }

  // 마지막 업데이트로부터 충분한 시간이 지났는지 확인
  canProcessExternalUpdate(): boolean {
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    const hasStableState = this.pendingUpdates.size === 0;
    const hasEnoughTime = timeSinceLastUpdate > this.DEBOUNCE_DELAY;
    
    console.log(`[SyncManager] 외부 업데이트 허용 여부:`, {
      timeSinceLastUpdate,
      hasStableState,
      hasEnoughTime,
      pendingUpdates: Array.from(this.pendingUpdates)
    });
    
    return hasStableState && hasEnoughTime;
  }

  // 강제로 모든 업데이트 완료 처리
  forceCompleteAll(): void {
    this.pendingUpdates.clear();
    this.updateQueue = [];
    console.log('[SyncManager] 모든 업데이트 강제 완료');
  }

  // 업데이트 큐 상태 확인
  getQueueStatus(): string {
    return `Pending: ${this.pendingUpdates.size}, Queue: ${this.updateQueue.length}`;
  }
}

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const searchParams = useSearchParams();
  const fromTab = searchParams.get('from') || 'home'; // 이전 탭 정보
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Recipe[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0); // 마지막 업데이트 시간

  // 안정적인 동기화 매니저 인스턴스
  const syncManager = useRef(new StableSyncManager());
  
  // 구독 채널 참조
  const recipeSubscription = useRef<any>(null);
  const ingredientSubscription = useRef<any>(null);

  const ingredientSyncVersion = useIngredientSync();

  // 레시피 데이터를 최신으로 fetch하는 함수
  const fetchLatestRecipe = useCallback(async (force = false) => {
    if (!id) return;
    
    // 업데이트 중이면 스킵 (강제 새로고침이 아닌 경우)
    if (!force && !syncManager.current.isAllUpdatesComplete()) {
      console.log('[fetchLatestRecipe] 업데이트 진행 중이므로 fetch 스킵');
      return;
    }

    // 강제 새로고침이 아닌 경우 추가 조건 확인
    if (!force && !syncManager.current.canProcessExternalUpdate()) {
      console.log('[fetchLatestRecipe] 외부 업데이트 조건 불충족으로 스킵');
      return;
    }

    console.log('[fetchLatestRecipe] 레시피 데이터 fetch 시작');
    setLoading(true);
    try {
      const found = await recipeService.getRecipeById(id as string);
      if (found) {
        const latestRecipe = supabaseToRecipe(found);
        console.log('[fetchLatestRecipe] 레시피 데이터 업데이트:', latestRecipe.title);
        setRecipe(latestRecipe);
        await fetchRelatedRecipes(latestRecipe);
      } else {
        console.log('[fetchLatestRecipe] 레시피를 찾을 수 없음');
        setRecipe(null);
        setRelated([]);
      }
    } catch (error) {
      console.error('[fetchLatestRecipe] 레시피 데이터 fetch 실패:', error);
      setRecipe(null);
      setRelated([]);
    } finally {
      setLoading(false);
      console.log('[fetchLatestRecipe] 레시피 데이터 fetch 완료');
    }
  }, [id]);

  // 관련 레시피 조회 함수
  const fetchRelatedRecipes = useCallback(async (currentRecipe: Recipe) => {
    const ingredientIds = currentRecipe.ingredients.map(ing => ing.ingredient_id).filter(Boolean);
    if (ingredientIds.length === 0) {
      setRelated([]);
      return;
    }
    
    try {
      const { data, error } = await supabase.from('recipes').select('*');
      if (error) {
        console.error('관련 레시피 전체 조회 실패:', error);
        setRelated([]);
        return;
      }
      
      // 모든 관련 레시피의 재료 ID 수집
      const allRelatedIngredientIds = new Set<string>();
      (data || []).forEach(r => {
        if (r.id !== currentRecipe.id) {
          (r.ingredients || []).forEach((ing: any) => {
            if (ing.ingredient_id) {
              allRelatedIngredientIds.add(ing.ingredient_id);
            }
          });
        }
      });
      
      // 재료 마스터에서 최신 정보 조회
      const { data: ingredientMasterData, error: ingredientError } = await supabase
        .from('ingredients_master')
        .select('id, name, shop_url, is_favorite')
        .in('id', Array.from(allRelatedIngredientIds));
      
      if (ingredientError) {
        console.error('재료 마스터 정보 조회 실패:', ingredientError);
      }
      
      // 재료 정보 매핑 생성
      const ingredientMap = new Map();
      (ingredientMasterData || []).forEach((ing: any) => {
        ingredientMap.set(ing.id, ing);
      });
      
      const relatedRecipes = (data || [])
        .filter(r => r.id !== currentRecipe.id)
        .map(r => {
          // 재료 정보를 최신으로 업데이트
          const updatedIngredients = (r.ingredients || []).map((ing: any) => {
            const master = ingredientMap.get(ing.ingredient_id);
            return {
              ingredient_id: ing.ingredient_id || '',
              name: master?.name || ing.name,
              amount: ing.amount,
              unit: ing.unit,
              shop_url: master?.shop_url || ing.shop_url || '',
              is_favorite: master?.is_favorite || ing.is_favorite || false,
            };
          });
          
          return {
            ...r,
            ingredients: updatedIngredients
          };
        })
        .map(r => supabaseToRecipe(r))
        .map(r => {
          const otherIds = r.ingredients.map(ing => ing.ingredient_id);
          const commonIngredients = r.ingredients.filter(ing => ingredientIds.includes(ing.ingredient_id));
          return {
            ...r,
            _commonCount: commonIngredients.length,
            _commonNames: commonIngredients.map(ing => ing.name),
          };
        })
        .filter(r => r._commonCount > 0)
        .sort((a, b) => b._commonCount - a._commonCount)
        .slice(0, 5);
      
      setRelated(relatedRecipes);
    } catch (err) {
      console.error('관련 레시피 조회 중 오류:', err);
      setRelated([]);
    }
  }, [supabase]);

  // 레시피의 재료 정보를 최신으로 업데이트하는 함수
  const updateRecipeIngredients = useCallback(async () => {
    if (!recipe || !syncManager.current.canProcessExternalUpdate()) return;
    
    try {
      const ids = recipe.ingredients.map(ing => ing.ingredient_id).filter(Boolean);
      if (ids.length === 0) return;
      
      const { data } = await supabase
        .from('ingredients_master')
        .select('id, name, shop_url, is_favorite')
        .in('id', ids);
      
      const mergedIngredients = recipe.ingredients.map(ing => {
        const master = data?.find((row: any) => row.id === ing.ingredient_id);
        return { 
          ...ing, 
          name: master?.name || ing.name,
          shop_url: master?.shop_url || ing.shop_url,
          is_favorite: master?.is_favorite || ing.is_favorite
        };
      });
      
      setRecipe({ ...recipe, ingredients: mergedIngredients });
    } catch (error) {
      console.error('재료 정보 업데이트 실패:', error);
    }
  }, [recipe, supabase]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchLatestRecipe();
  }, [fetchLatestRecipe]);

  // Supabase 실시간 구독 설정
  useEffect(() => {
    if (!id) return;

    // 기존 구독 정리
    if (recipeSubscription.current) {
      recipeSubscription.current.unsubscribe();
    }
    if (ingredientSubscription.current) {
      ingredientSubscription.current.unsubscribe();
    }

    // WebSocket 연결 재시도 로직
    const setupSubscriptions = async () => {
      try {
    // 레시피 구독
    recipeSubscription.current = supabase
      .channel(`recipe-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('레시피 데이터 변경 감지:', payload);
          
              // 업데이트 중이면 스킵하여 깜빡임 방지
              if (syncManager.current.isUpdating('edit')) {
                console.log('수정 진행 중이므로 실시간 업데이트 스킵');
            return;
          }

              // 중복 호출 방지 (2초 내 중복 호출 스킵)
              const now = Date.now();
              if (now - lastUpdateTime < 2000) {
                console.log('중복 호출 방지 (2초 내)');
                return;
              }
              setLastUpdateTime(now);
              
              // 더 긴 디바운스 적용하여 과도한 업데이트 방지
          setTimeout(() => {
                if (!syncManager.current.isUpdating('edit') && syncManager.current.canProcessExternalUpdate()) {
                  console.log('실시간 업데이트 실행');
                  fetchLatestRecipe(true);
                } else {
                  console.log('실시간 업데이트 스킵 - 조건 불충족');
                }
              }, 1000);
        }
      )
          .subscribe((status) => {
            console.log('레시피 구독 상태:', status);
            if (status === 'CHANNEL_ERROR') {
              console.log('레시피 구독 오류, 재시도 중...');
              setTimeout(setupSubscriptions, 3000);
            }
          });

    // 재료 마스터 구독
    ingredientSubscription.current = supabase
      .channel(`ingredients-master`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ingredients_master'
        },
        (payload) => {
          console.log('재료 마스터 데이터 변경 감지:', payload);
          
          // 업데이트 중이거나 디바운스 시간이 지나지 않았으면 스킵
          if (!syncManager.current.canProcessExternalUpdate()) {
            console.log('업데이트 진행 중이므로 재료 변경 무시');
            return;
          }

              // 더 긴 디바운스로 재료 정보 업데이트
              setTimeout(() => {
                if (recipe && syncManager.current.canProcessExternalUpdate()) {
                  console.log('재료 정보 업데이트 실행');
            updateRecipeIngredients();
                  
                  // 관련 레시피도 함께 업데이트 (재료 변경 시 항상 업데이트)
                  console.log('관련 레시피 정보 업데이트 실행');
                  fetchRelatedRecipes(recipe);
                } else {
                  console.log('재료 정보 업데이트 스킵 - 조건 불충족');
                }
              }, 500);
        }
      )
          .subscribe((status) => {
            console.log('재료 구독 상태:', status);
            if (status === 'CHANNEL_ERROR') {
              console.log('재료 구독 오류, 재시도 중...');
              setTimeout(setupSubscriptions, 3000);
            }
          });

      } catch (error) {
        console.error('구독 설정 실패:', error);
        // 3초 후 재시도
        setTimeout(setupSubscriptions, 3000);
      }
    };

    setupSubscriptions();

    return () => {
      if (recipeSubscription.current) {
        recipeSubscription.current.unsubscribe();
      }
      if (ingredientSubscription.current) {
        ingredientSubscription.current.unsubscribe();
      }
    };
  }, [id, recipe, fetchLatestRecipe, updateRecipeIngredients, fetchRelatedRecipes]);

  // 재료 동기화 버전 변경 시 재료 정보 업데이트
  useEffect(() => {
    if (recipe && syncManager.current.canProcessExternalUpdate()) {
      console.log('[재료 동기화] 버전 변경으로 재료 정보 업데이트');
      updateRecipeIngredients();
    } else {
      console.log('[재료 동기화] 업데이트 조건 불충족으로 스킵');
    }
  }, [ingredientSyncVersion, recipe, updateRecipeIngredients]);

  // 레시피 삭제
  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm('정말 이 레시피를 삭제하시겠습니까?')) return;
    
    syncManager.current.startUpdate('delete');
    try {
      await recipeService.deleteRecipe(recipe.id);
      triggerRecipeSync();
      
      // 이전 탭 정보에 따라 적절한 페이지로 이동
      if (fromTab === 'recipebook') {
        router.push('/?tab=recipebook');
      } else if (fromTab === 'search') {
        router.push('/?tab=search');
      } else if (fromTab === 'favorites') {
        router.push('/?tab=favorites');
      } else {
        // 기본값은 홈 탭
        router.push('/?tab=home');
      }
    } catch (error) {
      console.error('레시피 삭제 실패:', error);
      alert('레시피 삭제에 실패했습니다.');
    } finally {
      syncManager.current.finishUpdate('delete');
    }
  };

  // 레시피 수정 저장
  const handleEditSave = async (updated: Recipe) => {
    try {
      console.log('[레시피 수정] 시작:', updated.title);
      setIsEditing(true);
      syncManager.current.startUpdate('edit');
      
      const dbIngredients = toDbIngredients(updated.ingredients);
      const updateObj = {
        title: updated.title,
        description: updated.description,
        ingredients: dbIngredients,
        steps: updated.steps,
        videourl: updated.videourl || undefined,
        isfavorite: updated.isfavorite
      };
      
      console.log('[레시피 수정] DB 업데이트 객체:', updateObj);
      
      const result = await recipeService.updateRecipe(updated.id, updateObj);
      if (result) {
        console.log('[레시피 수정] DB 업데이트 성공');
        
        // 성공 시 즉시 로컬 상태 업데이트 (깜빡임 방지)
        setRecipe(updated);
        setEditMode(false);
        triggerRecipeSync();
        
        // 더 긴 지연 후 최신 데이터로 새로고침
        setTimeout(() => {
          if (syncManager.current.canProcessExternalUpdate()) {
            console.log('[레시피 수정] 최신 데이터 새로고침 실행');
            fetchLatestRecipe(true);
          } else {
            console.log('[레시피 수정] 최신 데이터 새로고침 스킵');
          }
        }, 2000);
        
        alert('레시피가 성공적으로 수정되었습니다.');
      } else {
        console.error('[레시피 수정] DB 업데이트 실패');
        alert('레시피 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('[레시피 수정] 오류:', error);
      alert('레시피 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsEditing(false);
      // 더 긴 지연 후 상태 해제하여 깜빡임 방지
      setTimeout(() => {
      syncManager.current.finishUpdate('edit');
        console.log('[레시피 수정] 완료 - 동기화 상태 해제');
      }, 3000);
    }
  };

  // SupabaseRecipe → Recipe 변환
  function supabaseToRecipe(r: any): Recipe {
    return {
      id: r.id || '',
      title: r.title,
      description: r.description,
      ingredients: (r.ingredients || []).map((ing: any) => ({
        ingredient_id: ing.ingredient_id || '',
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        shop_url: ing.shop_url || ing.shopUrl || '',
        is_favorite: ing.is_favorite || false,
      })),
      steps: r.steps || [],
      videourl: r.videourl || '',
      channel: r.channel,
      createdat: r.createdat ? new Date(r.createdat) : new Date(),
      isfavorite: r.isfavorite || false
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center animate-fadeIn">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-white text-lg font-medium">레시피를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 animate-fadeIn">
        <YoristHeader />
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-3">레시피를 찾을 수 없습니다</h2>
          <p className="text-gray-400 mb-6">요청하신 레시피가 존재하지 않거나 삭제되었습니다</p>
          <button 
            onClick={() => {
              // 이전 탭 정보에 따라 적절한 페이지로 이동
              if (fromTab === 'recipebook') {
                router.push('/?tab=recipebook');
              } else if (fromTab === 'search') {
                router.push('/?tab=search');
              } else if (fromTab === 'favorites') {
                router.push('/?tab=favorites');
              } else {
                // 기본값은 홈 탭
                router.push('/?tab=home');
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-24 pt-6 max-w-md mx-auto">
      <YoristHeader />
      {editMode ? (
        <ManualRecipeForm
          initialRecipe={recipe}
          onSave={handleEditSave}
          onCancel={() => {
            setEditMode(false);
            setIsEditing(false);
            syncManager.current.forceCompleteAll();
          }}
        />
      ) : (
        <>
          {/* 헤더 섹션 */}
          <div className="mb-4 relative">
            <button
              onClick={() => {
                // 이전 탭 정보에 따라 적절한 페이지로 이동
                if (fromTab === 'recipebook') {
                  router.push('/?tab=recipebook');
                } else if (fromTab === 'search') {
                  router.push('/?tab=search');
                } else if (fromTab === 'favorites') {
                  router.push('/?tab=favorites');
                } else {
                  // 기본값은 홈 탭
                  router.push('/?tab=home');
                }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#232323] hover:bg-[#2a2a2a] text-white flex items-center justify-center focus:outline-none transition-colors"
              aria-label="뒤로가기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex flex-col items-center w-full px-12">
              <h1 className="text-lg font-bold text-white leading-tight text-center">{recipe.title}</h1>
              <div className="w-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mx-auto mt-2" aria-hidden="true"></div>
            </div>
            
            <button
              onClick={async () => {
                if (syncManager.current.isUpdating('favorite')) return;
                
                syncManager.current.startUpdate('favorite');
                
                // 낙관적 업데이트: UI를 즉시 변경
                setRecipe(prev => prev ? { ...prev, isfavorite: !prev.isfavorite } : null);

                try {
                  await recipeService.toggleFavorite(recipe.id, !recipe.isfavorite);
                } catch (error) {
                  console.error('레시피 즐겨찾기 토글 실패:', error);
                  // 실패 시 UI 롤백
                  setRecipe(prev => prev ? { ...prev, isfavorite: !prev.isfavorite } : null);
                } finally {
                  setTimeout(() => {
                    syncManager.current.finishUpdate('favorite');
                  }, 1000);
                }
              }}
              className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 ${
                recipe.isfavorite ? 'text-orange-400' : 'text-gray-400'
              } hover:text-orange-400 transition-colors`}
              aria-label={recipe.isfavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <svg
                className="w-6 h-6"
                fill={recipe.isfavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </button>
          </div>
          
          {/* 썸네일 섹션 */}
          <div className="mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden">
            <div className="relative w-full aspect-video">
              {(() => {
                const videoUrl = recipe.videourl || '';
                const videoId = getYouTubeVideoId(videoUrl);
                const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'hq') : '';
                if (videoUrl && videoId && thumbnailUrl) {
                  return (
                    <img
                      src={thumbnailUrl}
                      alt="유튜브 썸네일"
                      className="w-full h-full object-cover"
                    />
                  );
                } else {
                  return (
                    <div className="w-full h-full bg-[#232323] flex items-center justify-center text-gray-500 text-lg">
                      대표 이미지 없음
                    </div>
                  );
                }
              })()}
              
              {(() => {
                const videoUrl = recipe.videourl || '';
                return videoUrl && getYouTubeVideoId(videoUrl) ? (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-red-600 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg hover:bg-red-700 transition-colors text-xs font-bold"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 15l5.19-3L10 9v6zm12-3c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-2 0c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8 8 3.58 8 8z" />
                    </svg>
                    유튜브
                  </a>
                ) : null;
              })()}
            </div>
            
            {recipe.description && (
              <div className="p-3 border-t border-[#232323]">
                <button
                  className="flex items-center gap-1 text-orange-400 text-xs font-semibold focus:outline-none hover:underline"
                  onClick={() => setShowDescription(prev => !prev)}
                  aria-expanded={showDescription}
                  aria-controls="recipe-desc"
                >
                  {showDescription ? '설명 닫기' : '설명 보기'}
                  <svg className={`w-3 h-3 transition-transform ${showDescription ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDescription && (
                  <p id="recipe-desc" className="text-gray-400 text-xs mt-2 leading-relaxed animate-fadeIn">{recipe.description}</p>
                )}
              </div>
            )}
          </div>

          {/* 재료 섹션 */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              필요한 재료
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <Link
                  key={`${ingredient.ingredient_id || ingredient.name}-${index}`}
                  href={`/ingredient/${ingredient.ingredient_id}`}
                  className="block group"
                >
                  <div className="bg-[#232323] rounded-md p-1.5 flex items-center justify-between gap-2 group-hover:bg-[#2a2a2a] transition-colors">
                    <span className="flex-1 font-semibold text-white text-sm truncate" title={ingredient.name}>
                      {ingredient.name}
                    </span>
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-gray-400 text-xs whitespace-nowrap mr-2">{ingredient.amount} {ingredient.unit}</span>
                      {ingredient.shop_url && (
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = ingredient.shop_url?.startsWith('http') ? ingredient.shop_url : `https://${ingredient.shop_url}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="p-1 text-white hover:text-orange-400 transition-colors"
                          aria-label="구매링크"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                          </svg>
                        </button>
                      )}
                      
                      <button
                        onClick={async e => {
                          e.preventDefault(); e.stopPropagation();
                          if (!ingredient.ingredient_id) return;
                          
                          if (syncManager.current.isUpdating(`ingredient-${ingredient.ingredient_id}`)) return;
                          
                          syncManager.current.startUpdate(`ingredient-${ingredient.ingredient_id}`);
                          
                          // 낙관적 업데이트: UI를 즉시 변경
                          setRecipe(prev => prev ? {
                            ...prev,
                            ingredients: prev.ingredients.map(ing =>
                              ing.ingredient_id === ingredient.ingredient_id
                                ? { ...ing, is_favorite: !ing.is_favorite }
                                : ing
                            )
                          } : prev);

                          try {
                            const { data } = await supabase
                              .from('ingredients_master')
                              .select('is_favorite')
                              .eq('id', ingredient.ingredient_id)
                              .single();
                            const newVal = !data?.is_favorite;
                            await supabase
                              .from('ingredients_master')
                              .update({ is_favorite: newVal ? 'true' : 'false' })
                              .eq('id', ingredient.ingredient_id);
                            
                            triggerIngredientSync();
                          } catch (error) {
                            console.error('재료 즐겨찾기 토글 실패:', error);
                            // 실패 시 UI 롤백
                            setRecipe(prev => prev ? {
                              ...prev,
                              ingredients: prev.ingredients.map(ing =>
                                ing.ingredient_id === ingredient.ingredient_id
                                  ? { ...ing, is_favorite: !ing.is_favorite }
                                  : ing
                              )
                            } : prev);
                          } finally {
                            setTimeout(() => {
                              syncManager.current.finishUpdate(`ingredient-${ingredient.ingredient_id}`);
                            }, 1000);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                        aria-label="즐겨찾기"
                      >
                        <svg className="w-3.5 h-3.5" fill={ingredient.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 조리 단계 섹션 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                조리 단계
              </h2>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none transition-colors text-gray-400 hover:text-orange-400">
                <input
                  type="checkbox"
                  checked={showImportantOnly}
                  onChange={e => setShowImportantOnly(e.target.checked)}
                  className="w-3.5 h-3.5 text-orange-400 bg-[#232323] border-[#3a3a3a] rounded focus:ring-orange-400 focus:ring-2"
                />
                중요 단계만 보기
              </label>
            </div>
            
            <div className="space-y-3">
              {(showImportantOnly ? recipe.steps.filter(step => step.isImportant) : recipe.steps).map((step, i) => (
                <div
                  key={`step-${i}-${step.description.substring(0, 20)}`}
                  className={`border border-[#2a2a2a] rounded-xl p-3 shadow-lg hover:border-[#3a3a3a] transition-all duration-200 flex items-start gap-3 ${
                    step.isImportant ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#1a1a1a]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-base shadow-lg flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-white text-sm leading-relaxed">{step.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (syncManager.current.isUpdating('step')) return;

                      syncManager.current.startUpdate('step');

                      const originalSteps = recipe.steps;
                      const newSteps = recipe.steps.map((s, index) => 
                        i === index ? { ...s, isImportant: !s.isImportant } : s
                      );

                      // 낙관적 업데이트: UI를 즉시 변경
                      setRecipe(prev => prev ? { ...prev, steps: newSteps } : null);

                      try {
                        await supabase
                          .from('recipes')
                          .update({ steps: newSteps })
                          .eq('id', recipe.id);
                      } catch (error) {
                        console.error('중요 단계 업데이트 실패:', error);
                        // 실패 시 UI 롤백
                        setRecipe(prev => prev ? { ...prev, steps: originalSteps } : null);
                      } finally {
                        setTimeout(() => {
                          syncManager.current.finishUpdate('step');
                        }, 1000);
                      }
                    }}
                    className={`p-2 transition-all duration-200 ${
                      step.isImportant 
                        ? 'text-orange-400' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    aria-label="중요 단계 표시"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 관련 레시피 섹션 */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              관련 레시피
            </h2>
            {related.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-gray-500 text-center">
                관련 레시피가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {related.slice(0, 5).map((rel: any) => (
                  <Link key={rel.id} href={`/recipe/${rel.id}`}>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 hover:border-orange-400 transition-colors">
                      <div className="text-white font-bold text-base mb-1.5">{rel.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {rel._commonNames.map((name: string, idx: number) => (
                          <span key={name + idx} className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {name}
                          </span>
                        ))}
                        {rel.ingredients.filter((ing: any) => !rel._commonNames.includes(ing.name)).map((ing: any) => (
                          <span key={ing.ingredient_id} className="bg-[#232323] text-gray-400 text-xs px-2 py-1 rounded-full border border-[#3a3a3a]">
                            {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 mb-6">
            <button
              className="flex-1 py-2.5 rounded-lg bg-[#232323] border border-orange-400 text-orange-400 text-sm font-bold shadow transition-all duration-200 hover:border-orange-500 hover:text-orange-500 focus:outline-none"
              onClick={() => {
                setIsEditing(true);
                setEditMode(true);
              }}
              aria-label="레시피 수정"
            >
              레시피 수정
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg bg-[#232323] border border-red-500 text-red-500 text-sm font-bold shadow transition-all duration-200 hover:border-red-600 hover:text-red-600 focus:outline-none"
              onClick={handleDelete}
              aria-label="레시피 삭제"
            >
              레시피 삭제
            </button>
          </div>
        </>
      )}
      <BottomNavigation
        activeTab="recipebook"
        onTabChange={(tab) => {
          console.log('Recipe detail onTabChange called with:', tab);
          if (tab === 'home') {
            console.log('Navigating to home');
            router.push('/');
          } else if (tab === 'recipebook') {
            console.log('Navigating to recipebook');
            router.push('/?tab=recipebook');
          } else if (tab === 'favorites') {
            console.log('Navigating to favorites');
            router.push('/?tab=favorites');
          } else if (tab === 'search') {
            console.log('Navigating to search');
            router.push('/?tab=search');
          }
        }}
      />
    </main>
  );
}