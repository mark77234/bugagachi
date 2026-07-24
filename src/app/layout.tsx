import type { Metadata } from "next";
import "./globals.css";
import { MotionProvider } from "@/providers/motion-provider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://bugagachi.vercel.app"),
  title: "부가가치 · 부산 공공임대 자격 확인 + 추천",
  description:
    "부산 공공임대주택 신청 자격을 먼저 확인하고, 예산·생활 취향에 맞는 주택을 추천받으세요. 추천 결과는 법적 자격 확정이 아닙니다.",
  icons: {
    icon: "/assets/logo/bugagachi_website_logo.png",
    apple: "/assets/logo/bugagachi_website_logo.png",
  },
  openGraph: {
    title: "부가가치 · 부산 공공임대 자격 확인 + 추천",
    description:
      "부산 공공임대주택 신청 자격을 먼저 확인하고, 예산·생활 취향에 맞는 주택을 추천받으세요.",
    images: [{ url: "/assets/logo/bugagachi_website_logo.png", width: 1024, height: 1024 }],
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <MotionProvider>
          <AppShell>{children}</AppShell>
        </MotionProvider>
      </body>
    </html>
  );
}
