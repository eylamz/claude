import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex border-transparent items-center justify-center rounded-custom text-xs sm:text-sm font-medium outlineTab disabled:pointer-events-none disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-black/5 text-brand-900 hover:bg-btn-secondary dark:bg-btn-dark/50 dark:hover:bg-btnHover-dark/50",
        primaryBtn: "bg-header-dark text-header-text dark:text-header-text-dark hover:bg-brand-main/80 dark:bg-brand-main dark:hover:bg-brand-main/80",
        primary: "bg-brand-main text-white dark:text-text hover:bg-brand-main/80 dark:bg-brand-dark dark:hover:bg-brand-dark/80",
        success: "rounded-xl bg-success/10 dark:bg-success-dark/15 text-success dark:text-success-dark   hover:bg-success/15 dark:hover:bg-success-dark/20",
        brand: "rounded-xl bg-brand-main/25 dark:bg-brand-dark/15 text-brand-text dark:text-brand-main   hover:bg-brand-main/35 dark:hover:bg-brand-dark/20",
        header: "rounded-xl bg-header-dark/15 dark:bg-header-dark/15 text-header-text dark:text-header-main   hover:bg-header-main/35 dark:hover:bg-header-dark/20",
        save: "rounded-custom bg-brand-main dark:bg-brand-main text-white dark:text-success-dark   hover:bg-success/15 dark:hover:bg-success-dark/15",
        warning: "bg-warning-bg/20 text-warning dark:bg-warning-bg-dark/10 dark:text-warning",
        info: "bg-info-bg/10 dark:bg-info-bg-dark/10 text-info dark:text-info-dark",
        destructive: "bg-destructive/80 text-destructive-foreground hover:bg-destructive/70",
        outline: "bord bg-white/5 hover:bg-black/5 hover:text-text-hover   dark:bg-black/10 dark:hover:bg-white/5 dark:hover:text-text-hover-dark",
        muted: "bordtext-text dark:text-text-dark bg-black/5 hover:opacity-80  dark:bg-black/30 dark:text-text-secondary-dark ",
        brandGhost: "bg-brand-main/10 text-brand-main dark:bg-black/10 ",
        secondary: "btn text-text dark:text-text-dark hover:text-text/80 dark:hover:text-text-dark/80",
        ghost2: "bg-trasnsparent hover:bg-black/5 hover:text-text-hover   dark:bg-black/10 dark:hover:bg-white/5 dark:hover:text-text-hover-dark",
        ghost: "bg-black/[2.5%] hover:bg-black/5 hover:text-text-hover   dark:bg-btn-secondary-dark dark:hover:bg-white/15 dark:hover:text-text-hover-dark",
        link: "text-primary underline-offset-4 hover:underline",
        error: "rounded-xl bg-error/10 dark:bg-error-dark/15 text-error dark:text-error-dark   hover:bg-error/15 dark:hover:bg-error-dark/20",
      },
      size: {
        default: "h-9 sm:h-10 px-3 sm:px-4 py-1.5 sm:py-2",
        sm: "h-8 sm:h-9 rounded-md px-2.5 sm:px-3",
        lg: "h-10 sm:h-11 rounded-md px-6 sm:px-8",
        icon: "h-8 w-8 sm:h-10 sm:w-10",
        iconSm: "h-6 w-6 sm:h-8 sm:w-8",
        xl: "h-10 w-10 sm:h-12 sm:w-12",
        full: "w-full h-9 sm:h-10 px-3 sm:px-4 py-1.5 sm:py-2",
      },
      fontSize: {
        default: "text-xs sm:text-sm",
        sm: "text-xs",
        lg: "text-sm sm:text-base",
      },
      responsive: {
        true: "w-full sm:w-auto",
        false: "",
      },
    },
    compoundVariants: [
      {
        responsive: true,
        size: "icon",
        className: "w-8 sm:w-10",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      fontSize: "default",
      responsive: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  responsive?: boolean
  fontSize?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fontSize,
    responsive = false,
    asChild = false, 
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ 
          variant, 
          size, 
          fontSize,
          responsive,
          className 
        }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
