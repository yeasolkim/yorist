import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }

    // python 스크립트 경로 (프로젝트 루트 기준)
    const scriptPath = path.join(process.cwd(), 'youtube_transcript.py');

    // 가상환경의 python 경로
    const pythonPath = path.join(process.cwd(), 'ytvenv', 'bin', 'python');
    
    // Python 스크립트 실행 (가상환경의 python 사용)
    const transcript = await new Promise((resolve, reject) => {
      const py = spawn(pythonPath, [scriptPath, youtubeUrl]);
      let data = '';
      let error = '';
      py.stdout.on('data', (chunk) => { data += chunk.toString(); });
      py.stderr.on('data', (chunk) => { error += chunk.toString(); });
      py.on('close', (code) => {
        if (code === 0 && data && !data.startsWith('NO_')) {
          resolve(data.trim());
        } else {
          reject(error || data || '자막 추출 실패');
        }
      });
    });

    return NextResponse.json({ transcript });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 