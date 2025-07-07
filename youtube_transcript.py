#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YouTube 자막 추출 스크립트
YouTubeTranscriptApi를 사용하여 유튜브 영상의 자막을 가져옵니다.
"""

import re
import sys
from typing import List, Optional, Union, Any
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound


def extract_video_id(url: str) -> Optional[str]:
    """
    유튜브 URL에서 video ID를 추출합니다.
    
    Args:
        url: 유튜브 URL
        
    Returns:
        video ID 또는 None
    """
    # 다양한 유튜브 URL 패턴 지원
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def get_transcript_text(video_id: str) -> Optional[List[Any]]:
    """
    유튜브 영상의 자막을 가져와서 데이터로 반환합니다.
    
    Args:
        video_id: 유튜브 영상 ID
        
    Returns:
        자막 데이터 또는 None
    """
    try:
        # 1. 수동 자막 시도 (한국어 우선)
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # 한국어 수동 자막 찾기
        for transcript in transcript_list:
            if transcript.language_code == 'ko' and not transcript.is_generated:
                print(f"한국어 수동 자막을 찾았습니다.")
                return transcript.fetch()
        
        # 한국어 자동 자막 찾기
        for transcript in transcript_list:
            if transcript.language_code == 'ko' and transcript.is_generated:
                print(f"한국어 자동 자막을 찾았습니다.")
                return transcript.fetch()
        
        # 영어 수동 자막 찾기
        for transcript in transcript_list:
            if transcript.language_code == 'en' and not transcript.is_generated:
                print(f"영어 수동 자막을 찾았습니다.")
                return transcript.fetch()
        
        # 영어 자동 자막 찾기
        for transcript in transcript_list:
            if transcript.language_code == 'en' and transcript.is_generated:
                print(f"영어 자동 자막을 찾았습니다.")
                return transcript.fetch()
        
        # 첫 번째 사용 가능한 자막 사용
        for transcript in transcript_list:
            print(f"{transcript.language_code} 자막을 찾았습니다. (자동 생성: {transcript.is_generated})")
            return transcript.fetch()
            
    except TranscriptsDisabled:
        print("이 영상은 자막이 비활성화되어 있습니다.")
        return None
    except NoTranscriptFound:
        print("이 영상에는 사용 가능한 자막이 없습니다.")
        return None
    except Exception as e:
        print(f"자막 가져오기 중 오류가 발생했습니다: {str(e)}")
        return None


def format_transcript(transcript_data: List[Any]) -> str:
    """
    자막 데이터를 텍스트로 포맷팅합니다.
    
    Args:
        transcript_data: 자막 데이터 리스트
        
    Returns:
        포맷팅된 텍스트
    """
    if not transcript_data:
        return ""
    
    # 각 자막 항목의 텍스트만 추출하여 줄 단위로 결합
    text_lines = []
    for item in transcript_data:
        # FetchedTranscriptSnippet 객체의 text 속성에 직접 접근
        if hasattr(item, 'text'):
            text = item.text.strip()
        elif isinstance(item, dict):
            text = item.get('text', '').strip()
        else:
            text = str(item).strip()
        
        if text:
            text_lines.append(text)
    
    return '\n'.join(text_lines)


def main():
    """
    메인 함수
    """
    print("=== YouTube 자막 추출기 ===")
    print("유튜브 영상 링크를 입력하세요 (종료하려면 'quit' 입력):")
    
    while True:
        try:
            # 사용자 입력 받기
            url = input("\n유튜브 링크: ").strip()
            
            # 종료 조건
            if url.lower() in ['quit', 'exit', 'q']:
                print("프로그램을 종료합니다.")
                break
            
            if not url:
                print("유효한 URL을 입력해주세요.")
                continue
            
            # Video ID 추출
            video_id = extract_video_id(url)
            if not video_id:
                print("유효한 유튜브 URL이 아닙니다.")
                continue
            
            print(f"Video ID: {video_id}")
            print("자막을 가져오는 중...")
            
            # 자막 가져오기
            transcript_data = get_transcript_text(video_id)
            
            if transcript_data is None:
                print("자막이 없거나 접근이 제한되어 있습니다.")
                continue
            
            # 자막 텍스트 포맷팅
            transcript_text = format_transcript(transcript_data)
            
            if not transcript_text:
                print("자막 텍스트가 비어있습니다.")
                continue
            
            # 결과 출력
            print("\n" + "="*50)
            print("추출된 자막:")
            print("="*50)
            print(transcript_text)
            print("="*50)
            
        except KeyboardInterrupt:
            print("\n\n프로그램을 종료합니다.")
            break
        except Exception as e:
            print(f"예상치 못한 오류가 발생했습니다: {str(e)}")


if __name__ == "__main__":
    main() 