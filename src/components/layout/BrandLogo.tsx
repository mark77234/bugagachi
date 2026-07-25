import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  logoClassName,
  titleClassName,
  priority = false,
}: {
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="부가가치 홈으로 이동"
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
        className,
      )}
    >
      <Image
        src="/assets/logo/ic_logo.png"
        alt=""
        width={185}
        height={229}
        priority={priority}
        className={cn("h-10 w-auto shrink-0 object-contain", logoClassName)}
        aria-hidden
      />
      <Image
        src="/assets/logo/ic_title.png"
        alt=""
        width={608}
        height={241}
        priority={priority}
        className={cn("h-7 w-auto shrink-0 object-contain", titleClassName)}
        aria-hidden
      />
    </Link>
  );
}
