import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Image as RNImage,
} from 'react-native';
import {
  ArrowLeft,
  Camera as CameraIcon,
  Search,
  Filter,
  X,
  CheckSquare,
  Square,
  FileText,
  Users,
  Tag,
  Share2,
} from 'lucide-react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Share from 'react-native-share';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { generateId, getProjectById, getUsersByOrg, updateProject } from '../services/storageService';

const ProjectGalleryScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, projectName } = route.params;
  const canManageGallery = session?.role === ROLES.SUPER_ADMIN || session?.role === ROLES.ADMIN;
  const cameraRef = useRef(null);
  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [draftTagEmployeeIds, setDraftTagEmployeeIds] = useState([]);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [selectedFilterEmployeeIds, setSelectedFilterEmployeeIds] = useState([]);
  const [draftFilterEmployeeIds, setDraftFilterEmployeeIds] = useState([]);

  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [capturedPhotoPath, setCapturedPhotoPath] = useState('');
  const [capturedDescriptionDraft, setCapturedDescriptionDraft] = useState('');
  const [capturedTagEmployeeIds, setCapturedTagEmployeeIds] = useState([]);
  const [showCapturePreviewModal, setShowCapturePreviewModal] = useState(false);
  const [showCaptureDescriptionModal, setShowCaptureDescriptionModal] = useState(false);
  const [showCaptureTagModal, setShowCaptureTagModal] = useState(false);
  const [captureTagSearchQuery, setCaptureTagSearchQuery] = useState('');

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(item => {
      map[item.userId] = item;
    });
    return map;
  }, [employees]);

  const toDisplayUri = useCallback(path => {
    if (!path) return '';
    if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('http')) {
      return path;
    }
    return `file://${path}`;
  }, []);

  const isEmployeeRole = useCallback(roleValue => {
    const normalizedRole = String(roleValue || '').trim().toLowerCase();
    return normalizedRole === ROLES.WORKER || normalizedRole === ROLES.EMPLOYEE;
  }, []);

  const normalizeLegacyGallery = useCallback(projectData => {
    const existing = Array.isArray(projectData?.galleryItems) ? projectData.galleryItems : [];
    if (existing.length > 0) {
      return existing.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    const siteLogs = Array.isArray(projectData?.siteLogs) ? projectData.siteLogs : [];
    const legacy = [];
    siteLogs.forEach(log => {
      const photos = Array.isArray(log.photos) ? log.photos : [];
      photos.forEach((path, index) => {
        legacy.push({
          galleryId: generateId(`legacy_${index}`),
          imageUri: path,
          description: log.note || '',
          taggedEmployeeIds: Array.isArray(log.taggedEmployeeIds) ? log.taggedEmployeeIds : [],
          createdAt: log.timestamp || log.createdAt || new Date().toISOString(),
          createdBy: log.workerId || null,
        });
      });
    });
    return legacy.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, []);

  const loadData = useCallback(async () => {
    if (!session?.orgId || !projectId) return;
    setLoading(true);
    try {
      const [projectData, orgUsers] = await Promise.all([
        getProjectById(projectId),
        getUsersByOrg(session.orgId),
      ]);

      if (!projectData) {
        Alert.alert('Not Found', 'Project not found.');
        navigation.goBack();
        return;
      }

      // Only worker/employee roles should appear in tag & filter lists.
      const employeeOnly = orgUsers
        .filter(item => isEmployeeRole(item.role))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setProject(projectData);
      setEmployees(employeeOnly);
      setGalleryItems(normalizeLegacyGallery(projectData));
    } catch (error) {
      Alert.alert('Error', 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [isEmployeeRole, navigation, normalizeLegacyGallery, projectId, session?.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const persistItems = useCallback(async nextItems => {
    const sorted = nextItems.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    await updateProject(projectId, { galleryItems: sorted });
    setGalleryItems(sorted);
  }, [projectId]);

  const getTaggedEmployees = useCallback(item => {
    return (item.taggedEmployeeIds || []).map(id => employeeMap[id]).filter(Boolean);
  }, [employeeMap]);

  const shareImageItem = useCallback(async item => {
    if (!item?.imageUri) {
      Alert.alert('Share', 'Image not available to share.');
      return;
    }
    try {
      const taggedNames = getTaggedEmployees(item).map(emp => emp.name).filter(Boolean);
      const lines = [`Project: ${project?.projectName || projectName || 'Project'}`];
      if (item.description?.trim()) lines.push(`Description: ${item.description.trim()}`);
      if (taggedNames.length > 0) lines.push(`Tagged: ${taggedNames.join(', ')}`);

      await Share.open({
        url: toDisplayUri(item.imageUri),
        type: 'image/*',
        message: lines.join('\n'),
        failOnCancel: false,
      });
    } catch (error) {
      const message = error?.message || '';
      if (message.includes('User did not share')) return;
      Alert.alert('Share Error', message || 'Unable to share this image');
    }
  }, [getTaggedEmployees, project?.projectName, projectName, toDisplayUri]);

  const openCamera = async () => {
    if (!canManageGallery) {
      Alert.alert('Not Allowed', 'Only P1/P2 can add gallery photos.');
      return;
    }
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }
    }
    setCameraReady(false);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Camera', 'Camera is still initializing. Please wait a moment.');
      return;
    }
    try {
      let photo = null;
      try {
        photo = await cameraRef.current.takePhoto({ flash: 'off' });
      } catch (firstError) {
        photo = await cameraRef.current.takePhoto();
      }
      setCameraReady(false);
      setShowCamera(false);
      setCapturedPhotoPath(photo.path);
      setCapturedDescriptionDraft('');
      setCapturedTagEmployeeIds([]);
      setCaptureTagSearchQuery('');
      setShowCapturePreviewModal(true);
    } catch (error) {
      const reason = error?.message ? `\n\n${error.message}` : '';
      Alert.alert('Error', `Failed to capture image${reason}`);
    }
  };

  const saveCapturedItem = async () => {
    if (!capturedPhotoPath) return;
    const newItem = {
      galleryId: generateId('gallery'),
      imageUri: capturedPhotoPath,
      description: capturedDescriptionDraft.trim(),
      taggedEmployeeIds: capturedTagEmployeeIds,
      createdAt: new Date().toISOString(),
      createdBy: session.userId,
    };
    await persistItems([newItem, ...galleryItems]);
    setCapturedPhotoPath('');
    setCapturedDescriptionDraft('');
    setCapturedTagEmployeeIds([]);
    setCaptureTagSearchQuery('');
    setShowCapturePreviewModal(false);
  };

  const retakeCapturedItem = () => {
    setShowCapturePreviewModal(false);
    setCapturedPhotoPath('');
    setCapturedDescriptionDraft('');
    setCapturedTagEmployeeIds([]);
    setCaptureTagSearchQuery('');
    setCameraReady(false);
    setShowCamera(true);
  };

  const cancelCapturedItem = () => {
    setShowCapturePreviewModal(false);
    setCapturedPhotoPath('');
    setCapturedDescriptionDraft('');
    setCapturedTagEmployeeIds([]);
    setCaptureTagSearchQuery('');
  };

  const filteredGalleryItems = useMemo(() => {
    const query = imageSearchQuery.trim().toLowerCase();
    return galleryItems.filter(item => {
      if (selectedFilterEmployeeIds.length > 0) {
        const tags = item.taggedEmployeeIds || [];
        const hasMatch = selectedFilterEmployeeIds.some(id => tags.includes(id));
        if (!hasMatch) return false;
      }
      if (!query) return true;
      const taggedNames = getTaggedEmployees(item).map(emp => (emp.name || '').toLowerCase());
      return (
        (item.description || '').toLowerCase().includes(query) ||
        taggedNames.some(name => name.includes(query))
      );
    });
  }, [galleryItems, getTaggedEmployees, imageSearchQuery, selectedFilterEmployeeIds]);

  const selectedDetailItem = useMemo(
    () => galleryItems.find(item => item.galleryId === selectedDetailId) || null,
    [galleryItems, selectedDetailId]
  );

  const openDescriptionModal = item => {
    setEditingDescriptionId(item.galleryId);
    setDescriptionDraft(item.description || '');
    setShowDescriptionModal(true);
  };

  const saveDescription = async () => {
    const next = galleryItems.map(item => (
      item.galleryId === editingDescriptionId
        ? { ...item, description: descriptionDraft.trim(), updatedAt: new Date().toISOString() }
        : item
    ));
    await persistItems(next);
    setShowDescriptionModal(false);
    setEditingDescriptionId(null);
    setDescriptionDraft('');
  };

  const openTagModal = item => {
    setEditingTagId(item.galleryId);
    setDraftTagEmployeeIds(item.taggedEmployeeIds || []);
    setTagSearchQuery('');
    setShowTagModal(true);
  };

  const toggleDraftTag = userId => {
    setDraftTagEmployeeIds(prev => (
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    ));
  };

  const saveTags = async () => {
    const next = galleryItems.map(item => (
      item.galleryId === editingTagId
        ? { ...item, taggedEmployeeIds: draftTagEmployeeIds, updatedAt: new Date().toISOString() }
        : item
    ));
    await persistItems(next);
    setShowTagModal(false);
    setEditingTagId(null);
    setDraftTagEmployeeIds([]);
    setTagSearchQuery('');
  };

  const toggleDraftFilter = userId => {
    setDraftFilterEmployeeIds(prev => (
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    ));
  };

  const toggleCapturedTag = userId => {
    setCapturedTagEmployeeIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredEmployeesForTagModal = useMemo(() => {
    if (!tagSearchQuery.trim()) return employees;
    const query = tagSearchQuery.toLowerCase();
    return employees.filter(item => (item.name || '').toLowerCase().includes(query));
  }, [employees, tagSearchQuery]);

  const filteredEmployeesForFilterModal = useMemo(() => {
    if (!filterSearchQuery.trim()) return employees;
    const query = filterSearchQuery.toLowerCase();
    return employees.filter(item => (item.name || '').toLowerCase().includes(query));
  }, [employees, filterSearchQuery]);

  const employeesForCaptureTagModal = useMemo(() => {
    if (!captureTagSearchQuery.trim()) return employees;
    const query = captureTagSearchQuery.toLowerCase();
    return employees.filter(item => (item.name || '').toLowerCase().includes(query));
  }, [captureTagSearchQuery, employees]);

  const renderTagChips = item => {
    const tagged = getTaggedEmployees(item);
    if (tagged.length === 0) {
      return <Text style={styles.noTagsText}>No tagged employees</Text>;
    }
    return (
      <View style={styles.tagsWrap}>
        {tagged.map(emp => (
          <View key={emp.userId} style={styles.tagChip}>
            <Tag color={COLORS.primary} size={12} />
            <Text style={styles.tagChipText}>{emp.name}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGalleryCard = ({ item }) => {
    const tagged = getTaggedEmployees(item);
    const dateLabel = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown date';
    const tagsLabel = tagged.length > 0 ? `${tagged.length} tagged employee(s)` : 'No tags';
    return (
      <TouchableOpacity
        style={styles.listRow}
        onPress={() => {
          setSelectedDetailId(item.galleryId);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.8}
      >
        <RNImage source={{ uri: toDisplayUri(item.imageUri) }} style={styles.listThumb} resizeMode="cover" />
        <View style={styles.listInfo}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Text style={[styles.listDescription, !item.description && styles.placeholderText]} numberOfLines={1}>
            {item.description || 'No description added'}
          </Text>
          <Text style={styles.listMeta}>{tagsLabel}</Text>
        </View>
        <View style={styles.rowActionWrap}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              setSelectedDetailId(item.galleryId);
              setShowDetailsModal(true);
            }}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={() => shareImageItem(item)}>
            <Share2 color={COLORS.secondary} size={13} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (showCamera) {
    if (!cameraDevice) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setCameraReady(false);
              setShowCamera(false);
            }}
          >
            <X color={COLORS.white} size={22} />
          </TouchableOpacity>
          <Text style={styles.cameraHeaderTitle}>Project Gallery Camera</Text>
          <View style={styles.iconSpacer} />
        </View>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={cameraDevice}
          isActive={showCamera}
          photo={true}
          onInitialized={() => setCameraReady(true)}
          onError={error => {
            setCameraReady(false);
            Alert.alert('Camera Error', error?.message || 'Unable to initialize camera');
          }}
        />
        <View style={styles.captureWrap}>
          <TouchableOpacity
            style={[styles.captureButton, !cameraReady && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={!cameraReady}
          >
            <CameraIcon color={COLORS.white} size={26} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Gallery</Text>
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{project?.projectName || projectName || 'Project'}</Text>
          <Text style={styles.infoSubtitle}>{galleryItems.length} image{galleryItems.length === 1 ? '' : 's'}</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setDraftFilterEmployeeIds(selectedFilterEmployeeIds);
              setFilterSearchQuery('');
              setShowFilterModal(true);
            }}
          >
            <Filter color={COLORS.primary} size={16} />
            <Text style={styles.filterButtonText}>
              {selectedFilterEmployeeIds.length > 0 ? `Tagged: ${selectedFilterEmployeeIds.length}` : 'Filter Tags'}
            </Text>
          </TouchableOpacity>
          {canManageGallery ? (
            <TouchableOpacity style={styles.cameraActionButton} onPress={openCamera}>
              <CameraIcon color={COLORS.white} size={16} />
              <Text style={styles.cameraActionButtonText}>Open Camera</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Search color={COLORS.gray} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by description or tagged employee..."
            placeholderTextColor={COLORS.gray}
            value={imageSearchQuery}
            onChangeText={setImageSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading gallery...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredGalleryItems}
            keyExtractor={item => item.galleryId}
            renderItem={renderGalleryCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyTitle}>No images found</Text>
                <Text style={styles.emptySubtitle}>
                  {galleryItems.length === 0 ? 'Use Open Camera to add the first image.' : 'Try different filters.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Modal transparent visible={showCapturePreviewModal} animationType="fade" onRequestClose={cancelCapturedItem}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Captured Photo</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={cancelCapturedItem}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            {capturedPhotoPath ? (
              <RNImage source={{ uri: toDisplayUri(capturedPhotoPath) }} style={styles.previewImage} resizeMode="cover" />
            ) : null}
            <Text style={[styles.previewDescription, !capturedDescriptionDraft && styles.placeholderText]}>
              {capturedDescriptionDraft || 'No description added'}
            </Text>
            {capturedTagEmployeeIds.length > 0 ? (
              <View style={styles.tagsWrap}>
                {capturedTagEmployeeIds.map(id => (
                  <View key={id} style={styles.tagChip}>
                    <Tag color={COLORS.primary} size={12} />
                    <Text style={styles.tagChipText}>{employeeMap[id]?.name || id}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noTagsText}>No tagged employees</Text>
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionGhost} onPress={() => setShowCaptureDescriptionModal(true)}>
                <FileText color={COLORS.primary} size={16} />
                <Text style={styles.actionGhostText}>Description</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionSolid} onPress={() => setShowCaptureTagModal(true)}>
                <Users color={COLORS.white} size={16} />
                <Text style={styles.actionSolidText}>Tag Employees</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.captureDecisionRow}>
              <TouchableOpacity style={styles.captureGhostBtn} onPress={cancelCapturedItem}>
                <Text style={styles.captureGhostBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureGhostBtn} onPress={retakeCapturedItem}>
                <Text style={styles.captureGhostBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureDoneBtn} onPress={saveCapturedItem}>
                <Text style={styles.captureDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDetailsModal} animationType="fade" onRequestClose={() => setShowDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Image Details</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDetailsModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            {selectedDetailItem ? (
              <>
                <RNImage source={{ uri: toDisplayUri(selectedDetailItem.imageUri) }} style={styles.previewImage} resizeMode="cover" />
                <Text style={styles.dateText}>{new Date(selectedDetailItem.createdAt).toLocaleString()}</Text>
                <Text style={[styles.previewDescription, !selectedDetailItem.description && styles.placeholderText]}>
                  {selectedDetailItem.description || 'No description added'}
                </Text>
                {renderTagChips(selectedDetailItem)}
                <TouchableOpacity style={styles.shareDetailButton} onPress={() => shareImageItem(selectedDetailItem)}>
                  <Share2 color={COLORS.white} size={16} />
                  <Text style={styles.shareDetailButtonText}>Share</Text>
                </TouchableOpacity>
                {canManageGallery ? (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionGhost} onPress={() => openDescriptionModal(selectedDetailItem)}>
                      <FileText color={COLORS.primary} size={16} />
                      <Text style={styles.actionGhostText}>
                        {selectedDetailItem.description?.trim() ? 'Edit Description' : 'Add Description'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionSolid} onPress={() => openTagModal(selectedDetailItem)}>
                      <Users color={COLORS.white} size={16} />
                      <Text style={styles.actionSolidText}>Edit Tags</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.modalEmptyText}>Image not found</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showCaptureDescriptionModal} animationType="fade" onRequestClose={() => setShowCaptureDescriptionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo Description</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCaptureDescriptionModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Write a short description..."
              placeholderTextColor={COLORS.gray}
              value={capturedDescriptionDraft}
              onChangeText={setCapturedDescriptionDraft}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCaptureDescriptionModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showCaptureTagModal} animationType="fade" onRequestClose={() => setShowCaptureTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCaptureTagModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={captureTagSearchQuery}
                onChangeText={setCaptureTagSearchQuery}
              />
            </View>
            <FlatList
              data={employeesForCaptureTagModal}
              keyExtractor={item => item.userId}
              renderItem={({ item }) => {
                const selected = capturedTagEmployeeIds.includes(item.userId);
                return (
                  <TouchableOpacity style={styles.selectRow} onPress={() => toggleCapturedTag(item.userId)}>
                    {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                    <Text style={styles.selectRowText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.modalEmptyText}>No employees found</Text>}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCapturedTagEmployeeIds([])}>
                <Text style={styles.modalCancelText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={() => setShowCaptureTagModal(false)}>
                <Text style={styles.modalSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDescriptionModal} animationType="fade" onRequestClose={() => setShowDescriptionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{descriptionDraft.trim() ? 'Edit Description' : 'Add Description'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDescriptionModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Write a short description..."
              placeholderTextColor={COLORS.gray}
              value={descriptionDraft}
              onChangeText={setDescriptionDraft}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDescriptionModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveDescription}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showTagModal} animationType="fade" onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTagModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={tagSearchQuery}
                onChangeText={setTagSearchQuery}
              />
            </View>
            <FlatList
              data={filteredEmployeesForTagModal}
              keyExtractor={item => item.userId}
              renderItem={({ item }) => {
                const selected = draftTagEmployeeIds.includes(item.userId);
                return (
                  <TouchableOpacity style={styles.selectRow} onPress={() => toggleDraftTag(item.userId)}>
                    {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                    <Text style={styles.selectRowText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.modalEmptyText}>No employees found</Text>}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDraftTagEmployeeIds([])}>
                <Text style={styles.modalCancelText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveTags}>
                <Text style={styles.modalSaveText}>Save Tags</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showFilterModal} animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Tagged Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowFilterModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={filterSearchQuery}
                onChangeText={setFilterSearchQuery}
              />
            </View>
            <FlatList
              data={filteredEmployeesForFilterModal}
              keyExtractor={item => item.userId}
              renderItem={({ item }) => {
                const selected = draftFilterEmployeeIds.includes(item.userId);
                return (
                  <TouchableOpacity style={styles.selectRow} onPress={() => toggleDraftFilter(item.userId)}>
                    {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                    <Text style={styles.selectRowText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDraftFilterEmployeeIds([])}>
                <Text style={styles.modalCancelText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => {
                  setSelectedFilterEmployeeIds(draftFilterEmployeeIds);
                  setShowFilterModal(false);
                  setFilterSearchQuery('');
                }}
              >
                <Text style={styles.modalSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  iconSpacer: { width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: 16 },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
  },
  infoTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  infoSubtitle: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  filterButton: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filterButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  cameraActionButton: {
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cameraActionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  searchBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 },
  listContent: { paddingTop: 12, paddingBottom: 24, gap: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 10,
  },
  listThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.extraLightGray,
  },
  listInfo: { flex: 1, minWidth: 0 },
  listDescription: { marginTop: 3, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  listMeta: { marginTop: 3, color: COLORS.textLight, fontSize: 12 },
  rowActionWrap: { gap: 6 },
  detailsButton: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    backgroundColor: COLORS.primary + '10',
  },
  detailsButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  shareButton: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '60',
    backgroundColor: COLORS.secondary + '10',
    flexDirection: 'row',
    gap: 4,
  },
  shareButtonText: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  dateText: { color: COLORS.textLight, fontSize: 11 },
  placeholderText: { color: COLORS.gray },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  noTagsText: { color: COLORS.gray, fontSize: 12 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagChipText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    borderRadius: 10,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
  },
  actionGhostText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  actionSolid: {
    flex: 1,
    borderRadius: 10,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
  },
  actionSolidText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  loadingText: { color: COLORS.textLight, fontSize: 14 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: COLORS.textLight, fontSize: 13, textAlign: 'center', marginTop: 6 },
  cameraContainer: { flex: 1, backgroundColor: COLORS.black },
  cameraHeader: {
    position: 'absolute',
    top: 46,
    left: 16,
    right: 16,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraHeaderTitle: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  captureWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: { opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 14,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    backgroundColor: COLORS.extraLightGray,
    marginTop: 10,
  },
  previewDescription: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  shareDetailButton: {
    marginTop: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  shareDetailButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalTextArea: {
    marginTop: 10,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  modalCancel: { paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  modalCancelText: { color: COLORS.textLight, fontWeight: '600' },
  modalSave: {
    minWidth: 86,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalSaveText: { color: COLORS.white, fontWeight: '700' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  selectRowText: { color: COLORS.text, fontSize: 14 },
  modalEmptyText: { color: COLORS.textLight, textAlign: 'center', marginTop: 16, marginBottom: 10 },
  captureDecisionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  captureGhostBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  captureGhostBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  captureDoneBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  captureDoneBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ProjectGalleryScreen;
