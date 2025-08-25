import { Platform, StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import Board from "@/components/Board";
import { SafeAreaView } from "react-native-safe-area-context";

const isWeb = Platform.OS === "web";
const webPadding = isWeb ? { paddingVertical: 20 } : {};

export default function Index() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={webPadding}>
        <Board />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
