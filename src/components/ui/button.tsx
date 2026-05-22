import { forwardRef } from "react";
import { Pressable, Text, ActivityIndicator, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "destructive" | "outline";
type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
}

const variantContainer: Record<Variant, string> = {
  default: "bg-primary active:opacity-80",
  secondary: "bg-secondary active:opacity-80",
  ghost: "bg-transparent active:bg-muted",
  destructive: "bg-destructive active:opacity-80",
  outline: "bg-transparent border border-border active:bg-muted",
};

const variantText: Record<Variant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
};

const sizeContainer: Record<Size, string> = {
  default: "h-11 px-4 rounded-xl",
  sm: "h-9 px-3 rounded-lg",
  lg: "h-12 px-5 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  { variant = "default", size = "default", disabled, loading, className, textClassName, children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center",
        variantContainer[variant],
        sizeContainer[size],
        isDisabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : typeof children === "string" ? (
        <Text className={cn("text-sm font-semibold", variantText[variant], textClassName)}>{children}</Text>
      ) : (
        <View className="flex-row items-center gap-2">{children}</View>
      )}
    </Pressable>
  );
});
