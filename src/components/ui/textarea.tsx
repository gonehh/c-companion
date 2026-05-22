import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextInputProps {
  className?: string;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { className, numberOfLines = 4, ...rest },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      placeholderTextColor="#a89fb5"
      className={cn(
        "min-h-[96px] rounded-xl border border-border bg-input p-3 text-foreground",
        className,
      )}
      {...rest}
    />
  );
});
