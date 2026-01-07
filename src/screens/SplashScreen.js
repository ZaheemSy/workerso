import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    if (!navigation) return;

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/json/Rocket.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#6b78e8ff' }}>
        Workerso
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Off-white color
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: 220,
    height: 220,
  },
});

export default SplashScreen;
