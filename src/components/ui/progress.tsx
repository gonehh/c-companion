import { View } from "react-native";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
