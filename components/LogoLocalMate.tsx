import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function LogoLocalMate() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/Logo LocalMate.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 32,
  },
  logo: {
    width: 360,
    height: 240,
  },
});
