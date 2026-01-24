import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground bg-transparent [a&]:hover:bg-secondary",
        success:
          "border-transparent bg-[var(--success)]/10 text-[var(--success)] [a&]:hover:bg-[var(--success)]/20",
        warning:
          "border-transparent bg-[var(--warning)]/10 text-[var(--warning)] [a&]:hover:bg-[var(--warning)]/20",
        info:
          "border-transparent bg-[var(--info)]/10 text-[var(--info)] [a&]:hover:bg-[var(--info)]/20",
        accent:
          "border-transparent bg-[var(--lemon-100)] text-[var(--lemon-700)] [a&]:hover:bg-[var(--lemon-200)]",
        // Subtle variants
        "default-subtle":
          "border-border/50 bg-card text-foreground",
        "success-subtle":
          "border-[var(--success)]/20 bg-[var(--success)]/5 text-[var(--success)]",
        "warning-subtle":
          "border-[var(--warning)]/20 bg-[var(--warning)]/5 text-[var(--warning)]",
        "destructive-subtle":
          "border-destructive/20 bg-destructive/5 text-destructive",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
