import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Platform, View } from "react-native";
import Svg, { G, Path, PathProps } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  runOnJS,
  interpolate,
  withTiming,
  SharedValue,
  useAnimatedReaction,
  Easing,
  runOnUI,
  Extrapolation,
} from "react-native-reanimated";
import { svgPathProperties } from "svg-path-properties";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const PATH_PROPS: PathProps = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export interface DrawPadProps {
  strokeWidth?: number;
  stroke: string;
  pathLength: SharedValue<number>;
  playing: SharedValue<boolean>;
  signed?: SharedValue<boolean>;
}

export type DrawPadHandle = {
  erase: () => void;
  undo: () => void;
  play: () => void;
  stop: () => void;
};

const isWeb = Platform.OS === "web";

const DrawPad = forwardRef<DrawPadHandle, DrawPadProps>(
  ({ strokeWidth = 3.5, stroke, pathLength, playing, signed }, ref) => {
    const [paths, setPaths] = useState<string[]>([]);
    const currentPath = useSharedValue<string>("");
    const progress = useSharedValue(1);

    useEffect(() => {
      if (pathLength) {
        pathLength.value = paths.reduce((total, path) => {
          return total + new svgPathProperties(path).getTotalLength();
        }, 0);
      }
    }, [paths]);

    const animatedProps = useAnimatedProps(() => ({
      d: currentPath.value,
    }));

    const finishPath = () => {
      const pathValue = currentPath.value;
      if (pathValue) {
        setPaths((prev) => {
          const updatedPaths = [...prev, pathValue];
          setTimeout(() => {
            currentPath.value = "";
          }, 0);
          return updatedPaths;
        });
      }
    };

    const handleErase = () => {
      setPaths([]);
      currentPath.value = "";
    };

    const handleUndo = useCallback(() => {
      setPaths((prev) => {
        const newPaths = [...prev];
        newPaths.pop();
        return newPaths;
      });
    }, []);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePlay = useCallback(() => {
      if (!playing.value) {
        playing.value = true;
        timeoutRef.current = setTimeout(() => {
          playing.value = false;
        }, pathLength.value * 2);
      }
    }, [playing, pathLength]);

    const handleStop = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      runOnUI(() => {
        playing.value = false;
      })();
    }, [playing]);

    useImperativeHandle(ref, () => ({
      erase: handleErase,
      undo: handleUndo,
      play: handlePlay,
      stop: handleStop,
    }));

    const panGesture = Gesture.Pan()
      .minDistance(0)
      .onStart((e) => {
        currentPath.value = `M ${e.x} ${e.y}`;
      })
      .onUpdate((e) => {
        currentPath.value += ` L ${e.x} ${e.y}`;
      })
      .onEnd(() => {
        runOnJS(finishPath)();
      });

    useAnimatedReaction(
      () => playing.value,
      (isPlaying) => {
        const duration = pathLength.value * 2;
        const easing = Easing.bezier(0.4, 0, 0.5, 1);

        if (isPlaying) {
          progress.value = 0;
          progress.value = withTiming(1, { duration, easing });
          return;
        }

        progress.value = withTiming(
          0,
          {
            duration:
              signed?.value || progress.value > 0.999
                ? 1
                : progress.value * duration,
            easing,
          },
          () => {
            progress.value = 1;
          }
        );
      }
    );

    return (
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <Svg height={"100%"} width={"100%"}>
            {paths.map((p, i) => {
              const prevLength = paths.slice(0, i).reduce((total, prevPath) => {
                return total + new svgPathProperties(prevPath).getTotalLength();
              }, 0);

              return (
                <DrawPath
                  key={i}
                  path={p}
                  strokeWidth={strokeWidth}
                  stroke={stroke}
                  progress={progress}
                  prevLength={prevLength}
                  totalPathLength={pathLength}
                />
              );
            })}
            <AnimatedPath
              animatedProps={animatedProps}
              stroke={stroke}
              strokeWidth={strokeWidth}
              {...PATH_PROPS}
            />
          </Svg>
        </View>
      </GestureDetector>
    );
  }
);

const DrawPath = ({
  path,
  strokeWidth,
  stroke,
  progress,
  prevLength,
  totalPathLength,
}: {
  path: string;
  strokeWidth: number;
  stroke: string;
  prevLength?: number;
  progress?: SharedValue<number>;
  totalPathLength?: SharedValue<number>;
}) => {
  const pathRef = useRef<Path>(null);
  // Adjustment added to account for rendering quirks in strokeDasharray calculations.
  const PATH_LENGTH_ADJUSTMENT = 1;
  const length =
    new svgPathProperties(path).getTotalLength() + PATH_LENGTH_ADJUSTMENT;

  const animatedProps = useAnimatedProps(() => {
    const prev = prevLength ?? 0;
    const total = totalPathLength?.value ?? 0;

    const start = prev / total;
    const end = (prev + length) / total;
    const p = progress?.value ?? 1;

    const turn = interpolate(p, [start, end], [0, 1], Extrapolation.CLAMP);
    const opacity = p >= start ? 1 : 0;

    return {
      strokeDashoffset: interpolate(turn, [0, 1], [length, 0]) - 1,
      opacity,
    };
  });

  return (
    <G>
      <Path
        d={path}
        strokeWidth={strokeWidth}
        stroke={stroke}
        ref={pathRef}
        strokeOpacity={0.2}
        {...PATH_PROPS}
      />
      <AnimatedPath
        d={path}
        strokeWidth={strokeWidth}
        stroke={stroke}
        strokeDasharray={length}
        animatedProps={animatedProps}
        {...PATH_PROPS}
      />
    </G>
  );
};

export default DrawPad;
