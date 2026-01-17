import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { X, Calendar, Clock, ImageIcon } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getProjectById, getUserById } from '../services/storageService';

const SiteUpdateHistoryScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, projectName } = route.params;
  const [loading, setLoading] = useState(true);
  const [siteUpdates, setSiteUpdates] = useState([]);

  useEffect(() => {
    loadSiteUpdates();
  }, []);

  const loadSiteUpdates = async () => {
    try {
      setLoading(true);
      const project = await getProjectById(projectId);
      const logs = project.siteLogs || [];

      // Get user details for each log
      const logsWithDetails = await Promise.all(
        logs.map(async log => {
          const user = await getUserById(log.workerId);
          return {
            ...log,
            userName: user?.name || 'Unknown',
          };
        }),
      );

      // Sort by newest first
      logsWithDetails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSiteUpdates(logsWithDetails);
    } catch (error) {
      console.error('Error loading site updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Update History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {projectName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Site Update History</Text>

        {siteUpdates.length === 0 ? (
          <View style={styles.emptyCard}>
            <ImageIcon color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Site Updates Yet</Text>
            <Text style={styles.emptyText}>
              Site updates will appear here once they are added
            </Text>
          </View>
        ) : (
          siteUpdates.map((update, index) => (
            <View key={index} style={styles.updateCard}>
              <View style={styles.updateHeader}>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeBadge}>
                    <Calendar color={COLORS.primary} size={14} />
                    <Text style={styles.dateText}>{formatDate(update.timestamp)}</Text>
                  </View>
                  <View style={styles.dateTimeBadge}>
                    <Clock color={COLORS.secondary} size={14} />
                    <Text style={styles.timeText}>{formatTime(update.timestamp)}</Text>
                  </View>
                </View>
              </View>

              {/* Photo Thumbnail - Show first photo or all photos */}
              {(update.photos?.length > 0 || update.logPhotoUri) && (
                <View style={styles.photoContainer}>
                  {update.photos?.length > 0 ? (
                    <RNImage
                      source={{ uri: `file://${update.photos[0]}` }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <RNImage
                      source={{ uri: `file://${update.logPhotoUri}` }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  )}
                  {update.photos?.length > 1 && (
                    <View style={styles.photoCountBadge}>
                      <Text style={styles.photoCountText}>+{update.photos.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Note */}
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Notes:</Text>
                <Text style={styles.noteText}>{update.note}</Text>
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Updated by:</Text>
                <Text style={styles.userName}>{update.userName}</Text>
              </View>
            </View>
          ))
        )}
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  updateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateHeader: {
    marginBottom: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  photoContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  photo: {
    width: '100%',
    height: 200,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoCountText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  noteContainer: {
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  userLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default SiteUpdateHistoryScreen;
