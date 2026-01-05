import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Briefcase color={COLORS.white} size={80} strokeWidth={1.5} />
      <Text style={styles.title}>Workerso</Text>
      <Text style={styles.subtitle}>Workforce & Attendance Tracker</Text>
      <ActivityIndicator color={COLORS.white} size="large" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});

export default SplashScreen;
