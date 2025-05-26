import { SharedValue } from "react-native-reanimated";

export interface MaskedTextProps {
  color: string;
  baseColor: string;
  text: string;
  animatedStyle?: any;
  pressing?: SharedValue<boolean>;
  pathLength?: SharedValue<number>;
  signed?: SharedValue<boolean>;
}
