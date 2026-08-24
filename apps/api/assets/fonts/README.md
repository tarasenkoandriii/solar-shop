# Шрифт для PDF-счёта (ТЗ п.21)

`pdf-lib` из коробки поддерживает только WinAnsi-кодировку (латиница) в
стандартных 14 PDF-шрифтах — кириллица (українська мова) требует
embed'а внешнего TTF-шрифта через `@pdf-lib/fontkit`.

**Перед первым реальным использованием InvoiceService** положи сюда файл
`NotoSans-Regular.ttf` (или любой другой TTF с кириллицей, напр. DejaVu
Sans, Roboto) — я не смог скачать сам файл шрифта в этой сессии: сеть
песочницы, где писался код, разрешает только npm/pypi/github registry-домены,
не CDN шрифтов. `InvoiceService.generatePdf()` уже написан с `fontkit.register()`
и ждёт файл по пути `assets/fonts/NotoSans-Regular.ttf` — при отсутствии
файла падает с понятной ошибкой (не молча рендерит кракозябры).

Источники бесплатных TTF с кириллицей: Google Fonts (Noto Sans, Roboto),
DejaVu Fonts.
