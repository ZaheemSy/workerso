import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image as RNImage,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera as CameraIcon, X, Save, Calendar, Clock, ImageIcon, Trash2, Plus } from 'lucide-react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getProjectById, updateProject } from '../services/storageService';

const WorksitePhotoUploadScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId } = route.params;
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState('');
  const [updateDate, setUpdateDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(updateDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setUpdateDate(newDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(updateDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setUpdateDate(newDate);
    }
  };

  const takePicture = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto({ flash: 'auto' });
        setPhotos([...photos, photo.path]);
        setShowCamera(false);
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Please take at least one photo');
      return;
    }

    if (!note.trim()) {
      Alert.alert('Error', 'Please add a note');
      return;
    }

    setLoading(true);
    try {
      const project = await getProjectById(projectId);
      const newLog = {
        photos: photos,
        note: note.trim(),
        workerId: session.userId,
        timestamp: updateDate.toISOString(),
      };

      const updatedSiteLogs = [...(project.siteLogs || []), newLog];
      await updateProject(projectId, { siteLogs: updatedSiteLogs });

      setLoading(false);
      Alert.alert('Success!', 'Site update uploaded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to upload site update');
      console.error('Upload site log error:', error);
    }
  };

  if (showCamera) {
    if (!device) {
      return (
        <View style={styles.container}>
          <Text style={styles.emptyText}>Loading camera...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.headerButton}>
            <X color={COLORS.white} size={28} />
          </TouchableOpacity>
          <Text style={styles.cameraHeaderTitle}>Take Site Photo</Text>
          <View style={{ width: 28 }} />
        </View>

        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
        />

        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner}>
              <CameraIcon color={COLORS.white} size={32} />
            </View>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Site Update</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Site Photos</Text>

        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((photoPath, index) => (
              <View key={index} style={styles.photoThumbnailContainer}>
                <RNImage
                  source={{ uri: `file://${photoPath}` }}
                  style={styles.photoThumbnail}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Trash2 color={COLORS.white} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.photoButton} onPress={() => setShowCamera(true)}>
          <CameraIcon color={COLORS.primary} size={32} />
          <Text style={styles.photoButtonText}>
            {photos.length > 0 ? 'Add More Photos' : 'Take Photos'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Notes</Text>

        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe site progress, issues, or observations..."
            placeholderTextColor={COLORS.gray}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionTitle}>Update Date & Time</Text>

        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar color={COLORS.primary} size={20} />
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.dateTimeLabel}>Date</Text>
              <Text style={styles.dateTimeValue}>
                {updateDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Clock color={COLORS.secondary} size={20} />
            <View style={styles.dateTimeTextContainer}>
              <Text style={styles.dateTimeLabel}>Time</Text>
              <Text style={styles.dateTimeValue}>
                {updateDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={updateDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={updateDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Save color={COLORS.white} size={20} style={styles.buttonIcon} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Uploading...' : 'Upload Site Update'}
          </Text>
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
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  photoButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  photoButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  photoThumbnailContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAreaContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
    minHeight: 120,
  },
  textArea: {
    fontSize: 16,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  cameraHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default WorksitePhotoUploadScreen;
