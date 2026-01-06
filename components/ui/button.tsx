import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex border border-transparent items-center justify-center rounded-custom text-xs sm:text-sm font-medium outlineTab disabled:pointer-events-none disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        headerBtn: "bg-transparent text-text dark:text-text-dark hover:bg-header-main/80 dark:bg-transparent dark:hover:bg-header-main/80",
        default: "bg-black/5 text-brand-900 hover:bg-btn-secondary dark:bg-btn-dark/50 dark:hover:bg-btnHover-dark/50",
        primaryBtn: "bg-header-dark text-header-text dark:text-header-text-dark hover:bg-brand-main/80 dark:bg-brand-main dark:hover:bg-brand-main/80",
        primary: "bg-brand-main text-white dark:text-text hover:bg-brand-main/80 dark:bg-brand-dark dark:hover:bg-brand-dark/80",
        success: "rounded-xl bg-success/10 dark:bg-success-dark/15 text-success dark:text-success-dark   hover:bg-success/15 dark:hover:bg-success-dark/20",
        brand: "border-brand-main/40 dark:border-brand-dark/20 bg-brand-main/25 dark:bg-brand-dark/15 text-brand-text dark:text-brand-main   hover:bg-brand-main/35 dark:hover:bg-brand-dark/20",
        brandOutline: "border text-[#16641a] dark:text-[#85ef8a] bg-[#defce0] dark:bg-[#1452174d] border-[#85ef8a] dark:border-[#1452174d]",
        header: "rounded-xl bg-header-dark/15 dark:bg-header-dark/15 text-header-text dark:text-header-main   hover:bg-header-main/35 dark:hover:bg-header-dark/20",
        save: "rounded-custom bg-brand-main dark:bg-brand-main text-white dark:text-success-dark   hover:bg-success/15 dark:hover:bg-success-dark/15",
        warning: "bg-warning-bg/20 text-warning dark:bg-warning-bg-dark/10 dark:text-warning",
        info: "bg-info-bg dark:bg-info-bg-dark text-info dark:text-info-dark border-info-border dark:border-info-border-dark",
        destructive: "bg-destructive/80 text-destructive-foreground hover:bg-destructive/70",
        outline: "bord bg-white/5 hover:bg-black/5 hover:text-text-hover   dark:bg-black/10 dark:hover:bg-white/5 dark:hover:text-text-hover-dark",
        none: "text-text/80 dark:text-text-dark/80 hover:bg-black/5 hover:text-text-hover dark:hover:bg-white/5 dark:hover:text-text-hover-dark",
        brandIcon: "text-brand-main dark:text-brand-dark",
        warningIcon: "text-warning dark:text-warning-dark",
        infoIcon: "text-info dark:text-info-dark",
        muted: "bord text-text dark:text-text-dark bg-black/5 hover:opacity-80  dark:bg-black/30 dark:text-text-secondary-dark ",
        brandGhost: "bg-brand-main/10 text-brand-main dark:bg-black/10 ",
        secondary: "btn text-text dark:text-text-dark hover:text-text/80 dark:hover:text-text-dark/80",
        ghost2: "bg-trasnsparent hover:bg-black/5  hover:text-text-hover   dark:bg-black/10 dark:hover:bg-white/5 dark:hover:text-text-hover-dark",
        popover: "bg-trasnsparent hover:bg-black/5 hover:text-text-hover   dark:bg-black/10 dark:hover:bg-white/10 dark:hover:text-text-hover-dark",
        ghost: "border-[#e6e6e6] dark:border-[#494949] bg-black/[2.5%] hover:bg-black/5 hover:text-text-hover   dark:bg-btn-secondary-dark dark:hover:bg-white/15 dark:hover:text-text-hover-dark",
        link: "text-primary underline-offset-4 hover:underline",
        error: "bg-error-bg dark:bg-error-bg-dark text-white dark:text-black hover:bg-error-dark/80 dark:hover:bg-error-dark/80",
        purple: "bg-[#e7defc] dark:bg-[#472881] text-[#915bf5] dark:text-[#c5b6fd] border-[#b99ef867] dark:border-[#5f4cc54d]",
        red: "border-[#ffc5c5] dark:border-[#f3394c3b] bg-[#ffe6e6] dark:bg-[#311c1c] text-[#cc2a2a] dark:text-[#f3394c]   hover:bg-[#ffdbdb] dark:hover:bg-[#3e2323]",
        orange: "border-[#ffe0bb] dark:border-[#f39d393b] bg-[#fff1e0] dark:bg-[#31271c] text-[#e49a43] dark:text-[#f39d39]   hover:bg-[#ffead1] dark:hover:bg-[#3e3123]",
        green: "border-[#baf0bb] dark:border-[#235725] bg-[#e3f6e4] dark:bg-[#0f2f10] text-brand-text dark:text-brand-main   hover:bg-[#dcf4dd] dark:hover:bg-[#123a14]",
        grey: "border-[#e6e6e6] dark:border-[#494949] text-[#424242] dark:text-[#afafaf] bg-[#efefef] hover:bg-[#e8e8e8] dark:bg-[#262626] dark:hover:bg-[#2c2c2c] ",
        blue: "bg-info-bg dark:bg-[#12384a] text-info dark:text-info-dark border-[#b6d9fd] dark:border-info-border-dark hover:bg-[#d0e4fb] dark:hover:bg-[#16455a]",



      },
      size: {
        default: "h-9 sm:h-10 px-3 sm:px-4 py-1.5 sm:py-2",
        xsm: "h-auto px-2 py-1.5",
        sm: "h-auto rounded-md px-2.5 py-2 sm:px-1.5 sm:py-1.5",
        lg: "h-10 sm:h-11 px-2 sm:p-4 py-1.5",
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
