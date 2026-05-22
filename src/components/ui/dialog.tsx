import { Modal, Pressable, View, Text, ScrollView } from "react-native";
import { X } from "lucide-react-native";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <Pressable
        onPress={() => onOpenChange(false)}
        className="flex-1 items-center justify-center bg-black/60 px-5"
      >
        <Pressable
          onPress={() => {}}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <Pressable
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Zamknij"
            className="absolute right-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full active:bg-muted"
          >
            <X size={18} color="#a89fb5" />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn("mb-3 pr-8", className)}>{children}</View>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn("text-lg font-bold text-foreground", className)}>{children}</Text>;
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn("gap-3", className)}>{children}</View>;
}
