import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-choice)] font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        secondary: "bg-navy text-white hover:opacity-90",
        outline: "border border-border bg-surface text-fg hover:bg-surface-muted",
        ghost: "text-fg hover:bg-surface-muted",
        danger: "border border-error/30 bg-error-subtle text-error hover:bg-error/10",
      },
      size: {
        lg: "h-13 px-6 text-base min-w-11",
        md: "h-11 px-5 text-base min-w-11",
        sm: "h-9 px-3 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = HTMLMotionProps<"button"> & VariantProps<typeof buttonVariants>;

/** 탭 시 미세 축소 피드백(whileTap). reduced-motion은 MotionProvider가 존중. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
