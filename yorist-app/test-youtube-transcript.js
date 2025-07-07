const { YouTubeTranscriptApi } = require('youtube-transcript-api');

async function main() {
  const videoId = '_TZ1xzzPdBg'; // 테스트할 유튜브 영상 ID
  try {
    const transcriptList = YouTubeTranscriptApi.list_transcripts(videoId);

    // 모든 자막을 배열로 변환
    const transcripts = [];
    transcriptList.forEach((transcript) => {
      transcripts.push(transcript);
    });

    // 한국어 수동 자막 우선
    let transcriptData = null;
    for (const transcript of transcripts) {
      if (transcript.language_code === 'ko' && !transcript.is_generated) {
        transcriptData = await transcript.fetch();
        console.log('[한국어 수동 자막]', transcriptData.slice(0, 5));
        return;
      }
    }
    // 한국어 자동 자막
    for (const transcript of transcripts) {
      if (transcript.language_code === 'ko' && transcript.is_generated) {
        transcriptData = await transcript.fetch();
        console.log('[한국어 자동 자막]', transcriptData.slice(0, 5));
        return;
      }
    }
    // 영어 수동 자막
    for (const transcript of transcripts) {
      if (transcript.language_code === 'en' && !transcript.is_generated) {
        transcriptData = await transcript.fetch();
        console.log('[영어 수동 자막]', transcriptData.slice(0, 5));
        return;
      }
    }
    // 영어 자동 자막
    for (const transcript of transcripts) {
      if (transcript.language_code === 'en' && transcript.is_generated) {
        transcriptData = await transcript.fetch();
        console.log('[영어 자동 자막]', transcriptData.slice(0, 5));
        return;
      }
    }
    // 아무 자막이나
    for (const transcript of transcripts) {
      transcriptData = await transcript.fetch();
      console.log('[기타 자막]', transcriptData.slice(0, 5));
      return;
    }

    console.log('사용 가능한 자막이 없습니다.');
  } catch (e) {
    console.error('에러:', e);
  }
}

main(); 