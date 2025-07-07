# YouTube 자막 추출기

유튜브 영상의 자막을 추출하는 Python 스크립트입니다.

## 설치 방법

1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt
```

또는 직접 설치:
```bash
pip install youtube-transcript-api
```

## 사용 방법

1. 스크립트 실행:
```bash
python youtube_transcript.py
```

2. 유튜브 영상 링크 입력:
```
유튜브 링크: https://www.youtube.com/watch?v=VIDEO_ID
```

3. 결과 확인:
- 자막이 있으면 텍스트가 콘솔에 출력됩니다
- 자막이 없으면 "자막이 없거나 접근이 제한되어 있습니다." 메시지가 출력됩니다

## 지원하는 URL 형식

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&t=123s`

## 자막 우선순위

1. 한국어 수동 자막 (가장 우선)
2. 한국어 자동 자막
3. 영어 수동 자막
4. 영어 자동 자막
5. 기타 언어 자막

## 예시 출력

```
=== YouTube 자막 추출기 ===
유튜브 영상 링크를 입력하세요 (종료하려면 'quit' 입력):

유튜브 링크: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Video ID: dQw4w9WgXcQ
자막을 가져오는 중...
한국어 자동 자막을 찾았습니다.

==================================================
추출된 자막:
==================================================
안녕하세요 여러분
오늘은 정말 특별한 요리를 만들어보겠습니다
먼저 재료를 준비해주세요
...
==================================================
```

## 종료 방법

- `quit`, `exit`, `q` 입력
- `Ctrl+C` (KeyboardInterrupt)

## 주의사항

- 인터넷 연결이 필요합니다
- 일부 영상은 자막이 비활성화되어 있을 수 있습니다
- 자막이 없는 영상의 경우 자동 생성 자막을 시도합니다
- 접근이 제한된 영상의 경우 자막을 가져올 수 없습니다 