import Toast from "react-native-toast-message";

export const toast = {
  success: (msg: string) =>
    Toast.show({ type: "success", text1: msg, position: "bottom", visibilityTime: 2500 }),
  error: (msg: string) =>
    Toast.show({ type: "error", text1: msg, position: "bottom", visibilityTime: 3500 }),
  info: (msg: string) =>
    Toast.show({ type: "info", text1: msg, position: "bottom", visibilityTime: 2500 }),
};

export { Toast };
