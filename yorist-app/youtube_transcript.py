import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def extract_video_id(url):
    import re
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
        r'youtube\.com/watch\?.*v=([^&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def main():
    if len(sys.argv) < 2:
        print("NO_URL")
        sys.exit(1)
    url = sys.argv[1]
    print("입력 URL:", url)
    video_id = extract_video_id(url)
    print("추출된 Video ID:", video_id)
    if not video_id:
        print("NO_ID")
        sys.exit(1)
    try:
        print("자막 요청 시작")
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
        print("자막 데이터(앞 3개):", transcript[:3])
        text_lines = [item['text'] for item in transcript]
        text = "\n".join(text_lines)
        print(text)
        print("\n[자막 일부 미리보기]")
        print("\n".join(text_lines[:10]))
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        print("NO_TRANSCRIPT", str(e))
        sys.exit(1)
    except Exception as e:
        print("ERROR:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main() 