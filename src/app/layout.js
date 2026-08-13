import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'StrobeArt - 频闪照片创作与分享平台',
  description: '上传视频，制作精美的频闪照片，分享你的作品并获取积分',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="text-white min-h-screen">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
