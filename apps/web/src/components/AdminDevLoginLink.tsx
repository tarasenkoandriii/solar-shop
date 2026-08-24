// Швидкий перехід у адмінку з клієнтського сайту під час локальної
// розробки — за прямим запитом користувача ("добавь дев-вход в админку
// правее дев-входа"). Не просто посилання на головну адмінки — з
// ?autoDevLogin=1, який AuthGate.tsx у apps/admin сам розпізнає й одразу
// натискає свій dev-вхід (без другого ручного кліку на іншому домені/
// порту). Видима лише при NEXT_PUBLIC_ENABLE_DEV_LOGIN=true, як і
// звичайний DevLoginButton поруч.
export function AdminDevLoginLink() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;

  if (!enabled || !adminUrl) return null;

  return (
    <a
      href={`${adminUrl}/?autoDevLogin=1`}
      target="_blank"
      rel="noopener noreferrer"
      title="Відкрити адмінку й одразу увійти без Telegram (тільки для локальної розробки)"
      className="rounded-full border border-dashed border-white/30 px-2.5 py-1 text-xs text-white/70 hover:border-white/60 hover:text-white"
    >
      🛠 Dev-вхід (адмінка)
    </a>
  );
}
