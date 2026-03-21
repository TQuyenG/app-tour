# Bộ giao diện Booking Tour (HTML/CSS)

Các màn hình đã có:
- `login.html` - Đăng nhập
- `register.html` - Đăng ký
- `home.html` - Trang chủ
- `styles.css` - CSS dùng chung

## Cách import sang Figma

### Cách 1 (phổ biến): Plugin HTML to Figma
1. Mở Figma.
2. Vào **Plugins** và cài plugin **HTML to Figma**.
3. Mở từng file `login.html`, `register.html`, `home.html` trong trình duyệt.
4. Copy toàn bộ phần tử trong trang (Ctrl+A, Ctrl+C).
5. Trong Figma, mở plugin và paste để convert thành layer.

### Cách 2: Dùng plugin convert từ URL
1. Chạy local server tại thư mục này (ví dụ VS Code Live Server).
2. Lấy URL từng trang.
3. Dùng plugin hỗ trợ import từ URL vào Figma.

## Gợi ý
- Kích thước màn hình đang thiết kế theo khung mobile `390x844`.
- Có thể chỉnh nhanh màu chính bằng biến `--primary` trong `styles.css`.

## Lưu ý khi dùng Expo
- Expo/React Native không render trực tiếp file `.html` trong app mobile.
- Các file trong thư mục `figma-html` chỉ để import sang Figma hoặc mở trên trình duyệt.
- Để xem trong Expo, cần màn hình `.tsx` trong thư mục `app/` (đã thêm `app/login.tsx`, `app/register.tsx`, `app/(tabs)/index.tsx`).
