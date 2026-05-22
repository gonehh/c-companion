import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#a89fb5"
      className={cn(
        "h-11 rounded-xl border border-border bg-input px-3 text-foreground",
        className,
      )}
      {...rest}
    />
  );
});
