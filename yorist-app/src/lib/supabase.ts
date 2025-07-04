import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 기존 types.ts에서 타입 import
import { Recipe, Ingredient, RecipeStep } from './types'

// Supabase용 레시피 타입 (기존 타입과 호환)
export interface SupabaseRecipe {
  id?: string
  title: string
  description: string
  ingredients: Ingredient[]
  steps: RecipeStep[]
  videoUrl?: string
  channel?: string
  tags?: string[]
  isVegetarian?: boolean
  createdAt?: string
  isFavorite?: boolean
  updated_at?: string
}

// 레시피 관련 데이터베이스 함수들
export const recipeService = {
  // 모든 레시피 조회
  async getAllRecipes(): Promise<SupabaseRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('createdAt', { ascending: false })

      if (error) {
        console.error('레시피 조회 실패:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return []
    }
  },

  // 단일 레시피 조회
  async getRecipeById(id: string): Promise<SupabaseRecipe | null> {
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

      return data
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return null
    }
  },

  // 새 레시피 추가
  async createRecipe(recipe: Omit<SupabaseRecipe, 'id' | 'createdAt' | 'updated_at'>): Promise<SupabaseRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([{
          ...recipe,
          createdAt: new Date().toISOString(),
          isFavorite: false
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
  async searchRecipes(searchTerm: string): Promise<SupabaseRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('createdAt', { ascending: false })

      if (error) {
        console.error('레시피 검색 실패:', error)
        throw error
      }

      return data || []
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
        .update({ isFavorite })
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