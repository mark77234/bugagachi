import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** wrapperClassName: 래퍼 span 용. inline-flex 라 기본은 내용 너비라서,
 *  flex 행 안에서 늘리려면(예: flex-1) 래퍼에 직접 줘야 한다. */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-[var(--radius-input)] border border-border bg-surface pl-3 pr-9 text-sm font-medium text-fg",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  ),
);
Select.displayName = "Select";
