import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ArrowLeft, Plus, X, Pencil, Package } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  createMaterial,
  getMaterialsByOrg,
  updateMaterial,
} from '../services/storageService';

const MaterialManagerScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [pricesVisible, setPricesVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const canRevealPrices = pricesVisible;

  const loadMaterials = useCallback(async () => {
    const list = await getMaterialsByOrg(session.orgId);
    setMaterials(list.sort((a, b) => a.name.localeCompare(b.name)));
  }, [session.orgId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleSummaryTap = () => {
    if (pricesVisible) return;
    const next = tapCount + 1;
    if (next >= 5) {
      setPricesVisible(true);
      setTapCount(0);
      return;
    }
    setTapCount(next);
  };

  const hidePrices = () => {
    setPricesVisible(false);
    setTapCount(0);
  };

  const openAddModal = () => {
    setNameInput('');
    setPriceInput('');
    setShowAddModal(true);
  };

  const openEditModal = item => {
    setEditingItem(item);
    setNameInput(item.name || '');
    setPriceInput(String(item.approximatePrice || ''));
    setShowEditModal(true);
  };

  const saveNewMaterial = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Validation', 'Please enter material name');
      return;
    }

    await createMaterial({
      orgId: session.orgId,
      name: nameInput.trim(),
      approximatePrice: parseFloat(priceInput || '0') || 0,
      createdBy: session.userId,
    });

    setShowAddModal(false);
    loadMaterials();
  };

  const saveEditMaterial = async () => {
    if (!editingItem) return;
    if (!nameInput.trim()) {
      Alert.alert('Validation', 'Please enter material name');
      return;
    }

    const updates = {
      name: nameInput.trim(),
    };

    if (canRevealPrices) {
      updates.approximatePrice = parseFloat(priceInput || '0') || 0;
    }

    await updateMaterial(editingItem.materialId, updates);
    setShowEditModal(false);
    setEditingItem(null);
    loadMaterials();
  };

  const renderItem = ({ item }) => (
    <View style={styles.materialCard}>
      <View style={styles.materialLeft}>
        <Package color={COLORS.primary} size={16} />
        <View style={styles.materialTextWrap}>
          <Text style={styles.materialName}>{item.name}</Text>
          {canRevealPrices ? (
            <Text style={styles.materialPrice}>
              {`Approx Price: ${Number(item.approximatePrice || 0).toFixed(2)}`}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rightRow}>
        {canRevealPrices ? (
          <Text style={styles.priceWatermark}>
            {Number(item.approximatePrice || 0).toFixed(0)}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Pencil color={COLORS.primary} size={16} />
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
        <Text style={styles.headerTitle}>Material Manager</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.summaryCard} activeOpacity={0.85} onPress={handleSummaryTap}>
          <Text style={styles.summaryLabel}>Total Materials: {materials.length}</Text>
          {canRevealPrices ? (
            <TouchableOpacity style={styles.hideBtn} onPress={hidePrices}>
              <Text style={styles.hideBtnText}>Hide</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addBtnText}>Add New Material</Text>
        </TouchableOpacity>

        <FlatList
          data={materials}
          keyExtractor={item => item.materialId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No materials added yet</Text>}
        />
      </View>

      <Modal transparent visible={showAddModal} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Material</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X color={COLORS.textLight} size={18} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Material name"
                placeholderTextColor={COLORS.gray}
                value={nameInput}
                onChangeText={setNameInput}
              />
              <TextInput
                style={[styles.input, styles.mt10]}
                placeholder="Approximate price"
                placeholderTextColor={COLORS.gray}
                keyboardType="decimal-pad"
                value={priceInput}
                onChangeText={setPriceInput}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveNewMaterial}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={showEditModal} animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Material</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={[styles.input, styles.inputNoTop]}
              placeholder="Material name"
              placeholderTextColor={COLORS.gray}
              value={nameInput}
              onChangeText={setNameInput}
            />
            {canRevealPrices ? (
              <>
                <Text style={[styles.fieldLabel, styles.mt10]}>Approx. Price</Text>
                <TextInput
                  style={[styles.input, styles.inputNoTop]}
                  placeholder="Approximate price"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="decimal-pad"
                  value={priceInput}
                  onChangeText={setPriceInput}
                />
              </>
              ) : (
                <Text style={styles.priceHiddenText}>Price editing is hidden until prices are revealed.</Text>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEditMaterial}>
                  <Text style={styles.saveBtnText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSpacer: { width: 24 },
  content: { flex: 1, padding: 16 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  hideBtn: {
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  addBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addBtnText: { color: COLORS.white, marginLeft: 8, fontWeight: '700', fontSize: 14 },
  listContent: { paddingTop: 12, paddingBottom: 16 },
  materialCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  materialLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  rightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 92 },
  materialTextWrap: { marginLeft: 10, flex: 1 },
  materialName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  materialPrice: { color: COLORS.textLight, marginTop: 2, fontSize: 12 },
  priceWatermark: {
    color: COLORS.text,
    opacity: 0.14,
    fontSize: 22,
    fontWeight: '800',
  },
  editBtn: { padding: 8, marginLeft: 6 },
  emptyText: { textAlign: 'center', marginTop: 24, color: COLORS.textLight },
  modalKeyboard: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.text,
  },
  inputNoTop: { marginTop: 6 },
  fieldLabel: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  mt10: { marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  cancelBtn: { height: 36, justifyContent: 'center', paddingHorizontal: 12 },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600' },
  saveBtn: {
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginLeft: 8,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
  priceHiddenText: { marginTop: 10, color: COLORS.textLight, fontSize: 12 },
});

export default MaterialManagerScreen;
