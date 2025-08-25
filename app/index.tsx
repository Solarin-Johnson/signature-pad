import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import Board from "@/components/Board";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView>
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
