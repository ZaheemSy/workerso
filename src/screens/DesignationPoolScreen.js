import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  ensureQuickDefaultDesignations,
  getQuickDesignationsByOrg,
  createQuickDesignation,
  updateQuickDesignation,
  deleteQuickDesignation,
} from '../services/storageService';

const DesignationPoolScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [designations, setDesignations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [designationName, setDesignationName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const loadDesignations = useCallback(async () => {
    await ensureQuickDefaultDesignations(session.orgId, session.userId);
    const list = await getQuickDesignationsByOrg(session.orgId);
    setDesignations(list.sort((a, b) => a.name.localeCompare(b.name)));
  }, [session.orgId, session.userId]);

  useEffect(() => {
    loadDesignations();
  }, [loadDesignations]);

  const openCreateModal = () => {
    setEditingId(null);
    setDesignationName('');
    setModalVisible(true);
  };

  const openEditModal = item => {
    setEditingId(item.quickDesignationId);
    setDesignationName(item.name);
    setModalVisible(true);
  };

  const saveDesignation = async () => {
    const value = designationName.trim();
    if (!value) {
      Alert.alert('Validation', 'Please enter designation name');
      return;
    }

    if (editingId) {
      await updateQuickDesignation(editingId, { name: value });
    } else {
      await createQuickDesignation({
        orgId: session.orgId,
        name: value,
        createdBy: session.userId,
      });
    }

    setModalVisible(false);
    setDesignationName('');
    setEditingId(null);
    loadDesignations();
  };

  const handleDelete = item => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQuickDesignation(item.quickDesignationId);
          loadDesignations();
        },
      },
    ]);
  };

  const renderRow = ({ item, index }) => (
    <View style={styles.row}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>
        {item.name?.slice(0, 3)?.toUpperCase() || 'DES'}
      </Text>
      <View style={styles.rowLeft}>
        <Layers color={COLORS.primary} size={16} />
        <Text style={styles.rowText}>{item.name}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
          <Pencil color={COLORS.primary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
          <Trash2 color={COLORS.danger} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Designation Pool</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Designation Library</Text>
          <Text style={styles.infoSubtitle}>
            Standardize role names and keep your quick employee setup consistent.
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Add New Designation</Text>
        </TouchableOpacity>

        <FlatList
          data={designations}
          keyExtractor={item => item.quickDesignationId}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No designations yet</Text>}
        />
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Designation' : 'Add Designation'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Designation name"
              placeholderTextColor={COLORS.gray}
              value={designationName}
              onChangeText={setDesignationName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveDesignation}>
                <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Add'}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSpacer: { width: 24 },
  content: { flex: 1, padding: 16 },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  infoSubtitle: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
  },
  addButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  listContent: { paddingBottom: 20 },
  row: {
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { marginLeft: 8, color: COLORS.text, fontSize: 15, fontWeight: '500' },
  rowWatermark: {
    position: 'absolute',
    right: 10,
    top: 4,
    fontSize: 40,
    fontWeight: '800',
    opacity: 0.13,
    letterSpacing: 1,
  },
  watermarkGreen: { color: '#10B981' },
  watermarkBlue: { color: '#3B82F6' },
  rowActions: { flexDirection: 'row' },
  iconBtn: { padding: 8 },
  emptyText: { textAlign: 'center', marginTop: 24, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.text,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600' },
  saveBtn: {
    marginLeft: 8,
    backgroundColor: COLORS.primary,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '600' },
});

export default DesignationPoolScreen;
