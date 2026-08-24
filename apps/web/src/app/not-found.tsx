export default function RootNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-leaf-900 py-24 text-white">
      <p className="text-6xl font-bold">404</p>
      <p className="text-lg">Сторінку не знайдено</p>
      <a href="/" className="rounded-full bg-sun-500 px-6 py-2 font-medium text-leaf-900">
        На головну
      </a>
    </div>
  );
}
