import { ImageSourcePropType } from "react-native";

export interface SizeItem {
  id: number;
  size: number;
  color: string;
  image: ImageSourcePropType;
  name: string;
}

export interface SizeCategory {
  name: string;
  items: {
    name: string;
    image: ImageSourcePropType;
    color: string;
  }[];
}

export interface SizeOrderingState {
  level: number;
  score: number;
  items: SizeItem[];
  selectedItems: SizeItem[];
  feedback: {
    type: "success" | "error" | "hint";
    message: string;
    emoji?: string;
  } | null;
}
