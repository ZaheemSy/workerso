import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Camera as CameraIcon, X, Save, Plus, Clock, Image } from 'lucide-react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getProjectById, updateProject } from '../services/storageService';

const WorksitePhotoUploadScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId } = route.params;
  const [photoUri, setPhotoUri] = useState(null);
  const [note, setNote] = useState('');
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [breaks, setBreaks] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const addBreak = () => {
    setBreaks([...breaks, { start: '', end: '' }]);
  };

  const removeBreak = (index) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const updateBreak = (index, field, value) => {
    const newBreaks = [...breaks];
    newBreaks[index][field] = value;
    setBreaks(newBreaks);
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
        setPhotoUri(photo.path);
        setShowCamera(false);
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      Alert.alert('Error', 'Please take a photo first');
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
        logPhotoUri: photoUri,
        note: note.trim(),
        workerId: session.userId,
        workStart: workStart || null,
        workEnd: workEnd || null,
        breaks: breaks.filter(b => b.start && b.end),
        timestamp: new Date().toISOString(),
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
        <Text style={styles.sectionTitle}>Site Photo</Text>

        <TouchableOpacity style={styles.photoButton} onPress={() => setShowCamera(true)}>
          {photoUri ? (
            <>
              <Image color={COLORS.success} size={32} />
              <Text style={styles.photoButtonText}>Photo captured - Tap to retake</Text>
            </>
          ) : (
            <>
              <CameraIcon color={COLORS.primary} size={32} />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </>
          )}
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

        <Text style={styles.sectionTitle}>Work Timing (Optional)</Text>

        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Start</Text>
            <View style={styles.inputWrapper}>
              <Clock color={COLORS.gray} size={18} />
              <TextInput
                style={styles.timeInput}
                placeholder="09:00"
                placeholderTextColor={COLORS.gray}
                value={workStart}
                onChangeText={setWorkStart}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>End</Text>
            <View style={styles.inputWrapper}>
              <Clock color={COLORS.gray} size={18} />
              <TextInput
                style={styles.timeInput}
                placeholder="18:00"
                placeholderTextColor={COLORS.gray}
                value={workEnd}
                onChangeText={setWorkEnd}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>

        <View style={styles.breakSection}>
          <View style={styles.breakHeader}>
            <Text style={styles.sectionTitle}>Breaks</Text>
            <TouchableOpacity style={styles.addButton} onPress={addBreak}>
              <Plus color={COLORS.primary} size={18} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {breaks.map((breakItem, index) => (
            <View key={index} style={styles.breakItem}>
              <View style={styles.breakInputs}>
                <TextInput
                  style={styles.breakInput}
                  placeholder="Start"
                  placeholderTextColor={COLORS.gray}
                  value={breakItem.start}
                  onChangeText={(value) => updateBreak(index, 'start', value)}
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  style={styles.breakInput}
                  placeholder="End"
                  placeholderTextColor={COLORS.gray}
                  value={breakItem.end}
                  onChangeText={(value) => updateBreak(index, 'end', value)}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <TouchableOpacity onPress={() => removeBreak(index)} style={styles.removeButton}>
                <X color={COLORS.danger} size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  timeInputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  breakSection: {
    marginBottom: 24,
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  breakInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  breakInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  removeButton: {
    padding: 8,
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
