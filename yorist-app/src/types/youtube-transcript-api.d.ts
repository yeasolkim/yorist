declare module 'youtube-transcript-api' {
  export class YouTubeTranscriptApi {
    static list_transcripts(videoId: string): TranscriptList;
  }

  export class TranscriptList {
    [Symbol.iterator](): Iterator<Transcript>;
    forEach(callback: (transcript: Transcript) => void): void;
  }

  export class Transcript {
    language_code: string;
    is_generated: boolean;
    fetch(): Promise<TranscriptItem[]>;
  }

  export interface TranscriptItem {
    text: string;
    start: number;
    duration: number;
  }

  export class TranscriptsDisabled extends Error {
    name: 'TranscriptsDisabled';
  }

  export class NoTranscriptFound extends Error {
    name: 'NoTranscriptFound';
  }
} 