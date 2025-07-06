export default function YoristHeader() {
  return (
    <header className="w-full bg-black/70 backdrop-blur-md py-4 sm:py-6 mb-4 sm:mb-6 rounded-b-2xl sm:rounded-b-3xl shadow-sm flex flex-col items-center">
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center mb-1 sm:mb-2">
        Yorist
        <span className="ml-2 text-orange-400 text-base sm:text-lg align-super font-semibold">•</span>
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 font-medium">나만의 요리 리스트</p>
    </header>
  );
} 