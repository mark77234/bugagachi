import { cn } from "@/lib/utils";

/** 콘텐츠 폭 제한 컨테이너. size로 최대 폭 조정. */
export function PageContainer({
  children,
  size = "default",
  className,
}: {
  children: React.ReactNode;
  size?: "narrow" | "default" | "wide" | "full";
  className?: string;
}) {
  const max = {
    narrow: "max-w-[720px]",
    default: "max-w-[1024px]",
    wide: "max-w-[1280px]",
    full: "max-w-none",
  }[size];
  return <div className={cn("mx-auto w-full px-4 sm:px-6", max, className)}>{children}</div>;
}
