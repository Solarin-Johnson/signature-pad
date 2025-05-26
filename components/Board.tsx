import { Platform, Pressable, StyleSheet, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import DrawPad, { DrawPadHandle } from "./Drawpad";
import {
  Eraser,
  Eye,
  LucideProps,
  PenLine,
  RotateCcw,
  Undo,
} from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import MaskedText from "./MaskedText";

const ICON_PROPS: LucideProps = {
  size: 21,
  strokeWidth: 1.8,
};
const BTN_HEIGHT = 38;
const isWeb = Platform.OS === "web";

export default function Board() {
  const text = useThemeColor({}, "text");
  const padRef = useRef<DrawPadHandle>(null);
  const pathLength = useSharedValue<number>(0);
  const playing = useSharedValue<boolean>(false);
  const signed = useSharedValue<boolean>(false);
  const pressing = useSharedValue(false);

  const handleErase = () => {
    if (padRef.current) {
      padRef.current.erase();
    }
  };
  const handleUndo = () => {
    if (padRef.current) {
      padRef.current.undo();
    }
  };
  const handleReset = () => {
    if (padRef.current) {
      padRef.current.erase();
    }
  };
  const handlePreview = () => {
    if (padRef.current) {
      padRef.current.play();
    }
  };

  const handleStop = () => {
    if (padRef.current) {
      padRef.current.stop();
    }
  };

  const handleSign = () => {
    if (padRef.current) {
      handleStop();
      setTimeout(() => {
        playing.value = true;
      }, 0);
      padRef.current.play();
    }
  };

  return (
    <View
      style={{
        boxShadow: "0px 2px 8px #00000015",
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: text + "25",
        maxWidth: 480,
        width: "92%",
        alignSelf: "center",
        height: 300,
      }}
    >
      <HeaderBar
        onReset={handleReset}
        onPreview={handlePreview}
        pathLength={pathLength}
      />
      <DrawPad
        ref={padRef}
        stroke={text}
        pathLength={pathLength}
        playing={playing}
        signed={signed}
        pressing={pressing}
      />
      <ActionBar
        onErase={handleErase}
        onUndo={handleUndo}
        onStop={handleStop}
        onPlay={handleSign}
        pathLength={pathLength}
        signed={signed}
        pressing={pressing}
      />
    </View>
  );
}

const ActionBar = ({
  onErase,
  onUndo,
  onStop,
  onPlay,
  pathLength,
  signed,
  pressing,
}: {
  onErase: () => void;
  onUndo: () => void;
  onStop: () => void;
  onPlay: () => void;
  pathLength: SharedValue<number>;
  signed: SharedValue<boolean>;
  pressing: SharedValue<boolean>;
}) => {
  const text = useThemeColor({}, "text");
  const buttonWidth = 140;
  const [inputType, setInputType] = useState<"touch" | "mouse" | "pen" | null>(
    null
  );

  const iconProps: LucideProps = {
    ...ICON_PROPS,
    color: text,
  };

  useAnimatedReaction(
    () => pressing.value,
    (isPressing) => {
      if (isPressing) {
        runOnJS(onPlay)();
      } else {
        runOnJS(onStop)();
      }
    }
  );

  useEffect(() => {
    if (!isWeb) return;
    const handlePointer = (e: PointerEvent) =>
      setInputType(e.pointerType as any);
    window.addEventListener("pointerdown", handlePointer);
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, []);

  const progress = useSharedValue(0);
  const previousProgress = useSharedValue(0);

  useDerivedValue(() => {
    const total = pathLength.value;
    const active = (signed.value || pressing.value) && total > 0;

    const factor = pressing.value ? 1 : 1 - progress.value;
    const duration = total * 2 * (active ? factor : previousProgress.value);

    if (active) previousProgress.value = progress.value;

    progress.value = withTiming(active ? 1 : 0, { duration });
  });

  useAnimatedReaction(
    () => progress.value,
    (currentProgress) => {
      if (currentProgress === 1) {
        signed.value = pathLength.value > 0 && pressing.value;
      } else {
        signed.value = false;
      }
    }
  );

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    width:
      signed.value || (isWeb && signed.value)
        ? buttonWidth
        : isWeb
        ? 0
        : buttonWidth * progress.value,
  }));

  const signedAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(signed.value ? BTN_HEIGHT : 0),
        },
      ],
    };
  });

  const startPressing = () => {
    pressing.value = !signed.value && pathLength.value > 0;
  };

  const stopPressing = () => {
    pressing.value = false;
  };

  return (
    <View
      style={{
        padding: 8,
        justifyContent: "space-between",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            gap: 12,
            opacity: 0.6,
          },
          signedAnimatedStyle,
        ]}
      >
        <Pressable onPress={onUndo} style={styles.button}>
          <Undo {...iconProps} />
        </Pressable>
        <Pressable onPress={onErase} style={styles.button}>
          <Eraser {...iconProps} />
        </Pressable>
      </Animated.View>
      <View>
        <Pressable
          style={[
            styles.confirmBtnBlock,
            styles.confirmBtn,
            { backgroundColor: text + "20", width: buttonWidth },
          ]}
          {...(isWeb && inputType !== "mouse"
            ? {
                onTouchStart: startPressing,
                onTouchEnd: stopPressing,
                onTouchCancel: stopPressing,
              }
            : {
                onPressIn: startPressing,
                onPressOut: stopPressing,
              })}
        >
          <Animated.View
            style={[
              {
                backgroundColor: "#D1FADC",
                ...StyleSheet.absoluteFillObject,
              },
              slideAnimatedStyle,
            ]}
          />
          <Animated.View style={[signedAnimatedStyle]}>
            <View style={[styles.confirmBtnBlock, {}]}>
              <ThemedText style={{ fontSize: 15, color: "#1B7F3E" }}>
                Signed
              </ThemedText>
            </View>
            <View style={styles.confirmBtnBlock}>
              <MaskedText
                color="#1B7F3E"
                baseColor="#D1FADC"
                text="Hold to confirm"
                animatedStyle={slideAnimatedStyle}
                pathLength={pathLength}
                pressing={pressing}
                signed={signed}
              />
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const HeaderBar = ({
  onReset,
  onPreview,
  pathLength,
}: {
  onPreview?: () => void;
  onReset?: () => void;
  pathLength: SharedValue<number>;
}) => {
  const text = useThemeColor({}, "text");

  const iconProps: LucideProps = {
    ...ICON_PROPS,
    size: 20,
    color: text,
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(pathLength.value > 0 ? 0 : -50, {
            duration: 300,
          }),
        },
      ],
    };
  });

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        opacity: 0.6,
        paddingHorizontal: 12,
        alignItems: "center",
      }}
    >
      <Pressable>
        <PenLine {...iconProps} />
      </Pressable>
      <ThemedText style={{ lineHeight: 48 }}>Draw signature</ThemedText>
      <Animated.View
        style={[
          {
            flex: 1,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-end",
          },
          animatedStyle,
        ]}
      >
        <Pressable onPress={onPreview} style={styles.headerBtn}>
          <Eye {...iconProps} size={22} />
        </Pressable>
        <Pressable onPress={onReset} style={styles.headerBtn}>
          <RotateCcw {...iconProps} size={19} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingLeft: 12,
  },
  headerBtn: {
    paddingRight: 6,
  },
  confirmBtn: {
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  confirmBtnBlock: {
    height: BTN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
