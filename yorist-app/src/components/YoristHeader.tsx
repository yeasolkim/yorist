export default function YoristHeader() {
  return (
    <header className="w-full bg-black/70 backdrop-blur-md py-6 mb-6 rounded-b-3xl shadow-sm flex flex-col items-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center mb-2">
        Yorist
        <span className="ml-2 text-orange-400 text-lg align-super font-semibold">•</span>
      </h1>
      <p className="text-sm text-gray-400 font-medium">나만의 요리 리스트</p>
    </header>
  );
} 