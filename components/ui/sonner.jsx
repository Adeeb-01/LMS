"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      style={{ fontFamily: 'var(--font-cairo), Cairo, system-ui, sans-serif' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-[inherit]",
          description: "group-[.toast]:text-muted-foreground font-[inherit]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-[inherit]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-[inherit]",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
