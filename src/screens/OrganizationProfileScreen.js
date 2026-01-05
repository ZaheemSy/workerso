import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { X, Building2, Save, Edit } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getOrganizationById } from '../services/storageService';

const OrganizationProfileScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    setLoading(true);
    try {
      const org = await getOrganizationById(session.orgId);
      setOrganization(org);
    } catch (error) {
      console.error('Error loading organization:', error);
      Alert.alert('Error', 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  if (!organization) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Organization not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Building2 color={COLORS.primary} size={48} />
          </View>
          <Text style={styles.companyName}>{organization.companyName}</Text>
          <Text style={styles.orgId}>Org ID: {organization.orgId}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Organization Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>{organization.companyName}</Text>
          </View>

          {organization.industry && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{organization.industry}</Text>
            </View>
          )}

          {organization.address && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{organization.address}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Created Date</Text>
            <Text style={styles.infoValue}>
              {new Date(organization.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => Alert.alert('Coming Soon', 'Edit functionality will be added soon')}
        >
          <Edit color={COLORS.primary} size={20} />
          <Text style={styles.editButtonText}>Edit Organization Details</Text>
        </TouchableOpacity>
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
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  orgId: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  infoSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  editButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 32,
    gap: 8,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});

export default OrganizationProfileScreen;
