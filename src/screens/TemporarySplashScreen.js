import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Text } from 'react-native';

const TemporarySplashScreen = ({ navigation }) => {
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);

  const handleScreenPress = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    // Clear previous timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Check for triple click
    if (newCount === 3) {
      setClickCount(0);
      navigation.goBack();
      return;
    }

    // Reset count after 500ms if not triple clicked
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 500);
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <View style={styles.container}>
        <Text style={styles.logo}>🚀</Text>
        <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#6b78e8ff' }}>
          Workerso
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Off-white color
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 120,
    marginBottom: 20,
  },
});

export default TemporarySplashScreen;
