import { Platform } from "react-native";

export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  if (Platform.OS !== "web") return "http://localhost:8080/api";
  return "/api";
}
