import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 기존 types.ts에서 타입 import
import { Recipe, RecipeIngredient, RecipeStep, SupabaseRecipe } from './types'

// 타입 변환 함수들 (실제 DB 스키마와 일치)
export const convertToSupabaseRecipe = (recipe: Recipe): Omit<SupabaseRecipe, 'id' | 'createdat' | 'updated_at'> => ({
  title: recipe.title,
  description: recipe.description,
  ingredients: recipe.ingredients,
  steps: recipe.steps,
  videourl: recipe.videourl, // snake_case로 통일
  isfavorite: recipe.isfavorite, // DB 필드명과 일치 (snake_case)
});

export const convertFromSupabaseRecipe = (recipe: SupabaseRecipe): Recipe => ({
  id: recipe.id!,
  title: recipe.title,
  description: recipe.description,
  ingredients: recipe.ingredients,
  steps: recipe.steps,
  videourl: recipe.videourl, // snake_case로 통일
  channel: undefined, // DB에 없는 필드
  tags: [], // DB에 없는 필드
  isVegetarian: false, // DB에 없는 필드
  createdat: new Date(recipe.createdat!), // DB 필드명과 일치 (snake_case)
  isfavorite: recipe.isfavorite ?? false // DB 필드명과 일치 (snake_case)
});

// RecipeIngredient[] → DB 저장용 변환 (snake_case)
export const toDbIngredients = (ingredients: RecipeIngredient[]) =>
  ingredients.map(ing => ({
    ingredient_id: ing.ingredient_id,
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    shop_url: ing.shop_url || '', // null 대신 빈 문자열로 변환
  }));

// 레시피 관련 데이터베이스 함수들
export const recipeService = {
  // 모든 레시피 조회
  async getAllRecipes(): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('createdat', { ascending: false }) // DB 필드명과 일치

      if (error) {
        console.error('레시피 조회 실패:', error)
        throw error
      }

      return (data || []).map(convertFromSupabaseRecipe)
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return []
    }
  },

  // 단일 레시피 조회
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('레시피 조회 실패:', error)
        return null
      }

      return data ? convertFromSupabaseRecipe(data) : null
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return null
    }
  },

  // 새 레시피 추가
  async createRecipe(recipe: Omit<SupabaseRecipe, 'id' | 'createdat' | 'updated_at'>): Promise<SupabaseRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([{
          ...recipe,
          createdat: new Date().toISOString(), // DB 필드명과 일치
          isfavorite: false // DB 필드명과 일치
        }])
        .select()
        .single()

      if (error) {
        console.error('레시피 생성 실패:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('레시피 생성 중 오류 발생:', error)
      return null
    }
  },

  // 레시피 수정
  async updateRecipe(id: string, recipe: Partial<SupabaseRecipe>): Promise<SupabaseRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .update({ ...recipe, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('레시피 수정 실패:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('레시피 수정 중 오류 발생:', error)
      return null
    }
  },

  // 레시피 삭제
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('레시피 삭제 실패:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('레시피 삭제 중 오류 발생:', error)
      return false
    }
  },

  // 제목으로 레시피 검색
  async searchRecipes(searchTerm: string): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('createdat', { ascending: false }) // DB 필드명과 일치

      if (error) {
        console.error('레시피 검색 실패:', error)
        throw error
      }

      return (data || []).map(convertFromSupabaseRecipe)
    } catch (error) {
      console.error('레시피 검색 중 오류 발생:', error)
      return []
    }
  },

  // 즐겨찾기 토글
  async toggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ isfavorite: isFavorite }) // DB 필드명과 일치
        .eq('id', id)

      if (error) {
        console.error('즐겨찾기 토글 실패:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('즐겨찾기 토글 중 오류 발생:', error)
      return false
    }
  }
} 