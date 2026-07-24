import type { Metadata } from "next";
import "./globals.css";
import { MotionProvider } from "@/providers/motion-provider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "부가가치 · 부산 공공임대 자격 확인 + 추천",
  description:
    "부산 공공임대주택 신청 자격을 먼저 확인하고, 예산·생활 취향에 맞는 주택을 추천받으세요. 추천 결과는 법적 자격 확정이 아닙니다.",
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
