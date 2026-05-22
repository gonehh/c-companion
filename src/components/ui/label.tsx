import { Text, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

export function Label({ className, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn("text-sm font-medium text-foreground mb-1.5", className)}
      {...rest}
    />
  );
}
