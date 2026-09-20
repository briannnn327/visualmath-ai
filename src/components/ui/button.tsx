import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        primary: "bg-brand-gradient text-on-primary shadow-soft hover:shadow-float hover:brightness-105",
        secondary: "bg-secondary text-white shadow-soft hover:bg-secondary-hover",
        tertiary:
          "bg-transparent text-primary ring-1 ring-inset ring-primary/40 hover:bg-primary-lighter",
        outline: "bg-transparent text-on-surface ring-1 ring-inset ring-outline-variant hover:bg-surface-container",
        ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        danger: "bg-error text-white shadow-soft hover:brightness-105",
        success: "bg-success text-white shadow-soft hover:brightness-105",
        warning: "bg-warning text-white shadow-soft hover:brightness-105",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: IconName;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} size={size === "sm" || size === "icon-sm" ? 16 : 18} />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };