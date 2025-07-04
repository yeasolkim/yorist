export default function YoristHeader() {
  return (
    <header className="w-full bg-black/70 backdrop-blur-md py-5 mb-4 rounded-b-2xl shadow-sm flex flex-col items-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center">
        Yorist
        <span className="ml-2 text-orange-400 text-base align-super font-semibold">•</span>
      </h1>
      <p className="text-sm text-gray-400 mt-1">나만의 요리 리스트</p>
    </header>
  );
} 