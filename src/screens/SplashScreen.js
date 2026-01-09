import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
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
        //source={require('../assets/json/Rock_Ani.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Image
        source={require('../assets/images/pngs/workersoPng.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: 200,
    height: 80,
    marginTop: 20,
  },
});

export default SplashScreen;
