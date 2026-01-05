import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, Settings as SettingsIcon, Trash2, Info, HelpCircle, Shield } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { clearAllData } from '../services/storageService';

const SettingsScreen = ({ navigation }) => {
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all organizations, users, projects, and logs. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'All data cleared successfully', [
                { text: 'OK', onPress: () => navigation.replace('Login') },
              ]);
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      icon: Info,
      title: 'About Workerso',
      subtitle: 'Version 1.0.0',
      color: COLORS.primary,
      onPress: () =>
        Alert.alert(
          'About Workerso',
          'Workerso - Workforce, Attendance & Project Tracker\n\nVersion: 1.0.0\nPhase: Offline Mode\n\nA comprehensive workforce management solution for tracking attendance, work hours, and projects.'
        ),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      color: COLORS.secondary,
      onPress: () =>
        Alert.alert(
          'Help & Support',
          'For support and assistance:\n\n• Check the app documentation\n• Contact your organization admin\n• Report issues to the development team'
        ),
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      subtitle: 'Data storage and security',
      color: COLORS.warning,
      onPress: () =>
        Alert.alert(
          'Privacy & Security',
          'Your data is currently stored locally on this device using AsyncStorage.\n\nIn Phase 2, data will be synced to Firebase cloud storage with encryption.\n\nNo data is currently shared with third parties.'
        ),
    },
    {
      icon: Trash2,
      title: 'Clear All Data',
      subtitle: 'Delete all local data (destructive)',
      color: COLORS.danger,
      onPress: handleClearData,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <SettingsIcon color={COLORS.primary} size={48} />
          <Text style={styles.headerCardTitle}>App Settings</Text>
          <Text style={styles.headerCardSubtitle}>Manage your preferences</Text>
        </View>

        <Text style={styles.sectionTitle}>General</Text>

        {settingsOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionCard}
            onPress={option.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
              <option.icon color={option.color} size={24} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Currently running in Offline Mode (Phase 1).{'\n'}
            Cloud sync and advanced features coming in Phase 2.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  headerCardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default SettingsScreen;
