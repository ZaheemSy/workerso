import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Plus, X, CheckSquare, Square, Download } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  createMaterialRequest,
  getMaterialRequestsByProject,
  getMaterialsByOrg,
} from '../services/storageService';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';

const unlockMessage = 'The prices are not available yet, you can add prices soon';

const formatDateTime = iso => {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MaterialRequestsScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { mode = 'normal', projectId, projectName = 'Project' } = route.params;

  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showPrices, setShowPrices] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [quantityByMaterial, setQuantityByMaterial] = useState({});
  const [viewRequest, setViewRequest] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const canRevealPrices = showPrices && unlocked;

  const loadData = useCallback(async () => {
    const [materialList, requestList] = await Promise.all([
      getMaterialsByOrg(session.orgId),
      getMaterialRequestsByProject(session.orgId, mode, projectId),
    ]);

    setMaterials(materialList.sort((a, b) => a.name.localeCompare(b.name)));
    setRequests(requestList);
  }, [mode, projectId, session.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleShowPrices = value => {
    setShowPrices(value);
    if (!value) {
      setUnlocked(false);
      setTapCount(0);
      return;
    }

    if (!unlocked) {
      setShowUnlockModal(true);
      setTapCount(0);
    }
  };

  const handleUnlockMessageTap = () => {
    const next = tapCount + 1;
    if (next >= 6) {
      setUnlocked(true);
      setTapCount(0);
      setShowUnlockModal(false);
      return;
    }
    setTapCount(next);
  };

  const toggleMaterial = materialId => {
    setSelectedMaterialIds(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );

    setQuantityByMaterial(prev => {
      if (prev[materialId]) return prev;
      return { ...prev, [materialId]: '1' };
    });
  };

  const buildItemsFromDraft = () => {
    return selectedMaterialIds
      .map(materialId => {
        const material = materials.find(item => item.materialId === materialId);
        if (!material) return null;
        const qty = Math.max(parseInt(quantityByMaterial[materialId] || '0', 10) || 0, 0);
        if (qty <= 0) return null;

        const price = Number(material.approximatePrice || 0);
        return {
          materialId,
          materialName: material.name,
          quantity: qty,
          price,
          total: price * qty,
        };
      })
      .filter(Boolean);
  };

  const saveRequest = async () => {
    const items = buildItemsFromDraft();
    if (items.length === 0) {
      Alert.alert('Validation', 'Select at least one material with quantity');
      return;
    }

    await createMaterialRequest({
      orgId: session.orgId,
      mode,
      projectId,
      projectName,
      items,
      createdBy: session.userId,
    });

    setShowAddModal(false);
    setSelectedMaterialIds([]);
    setQuantityByMaterial({});
    loadData();
  };

  const requestGrandTotal = request =>
    (request.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0);

  const allRequestsGrandTotal = useMemo(
    () => requests.reduce((sum, request) => sum + requestGrandTotal(request), 0),
    [requests]
  );

  const toExcelRowsForRequest = request => {
    const rows = (request.items || []).map((item, index) => ({
      'Sl No': index + 1,
      Item: item.materialName,
      Nos: item.quantity,
      ...(canRevealPrices ? { Price: item.price } : {}),
      ...(canRevealPrices ? { 'Each Total': item.total } : {}),
      Date: formatDateTime(request.createdAt),
    }));

    if (canRevealPrices) {
      rows.push({
        'Sl No': '',
        Item: 'Total',
        Nos: '',
        Price: '',
        'Each Total': requestGrandTotal(request),
        Date: '',
      });
    }

    return rows;
  };

  const createPdfFromLines = async (lines, fileName) => {
    const escape = value =>
      String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    let stream = 'BT\n/F1 10 Tf\n40 800 Td\n';
    lines.forEach((line, idx) => {
      if (idx > 0) stream += '0 -14 Td\n';
      stream += `(${escape(line)}) Tj\n`;
    });
    stream += 'ET';

    const objects = [
      null,
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
      `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i <= 5; i += 1) {
      offsets[i] = pdf.length;
      pdf += `${objects[i]}\n`;
    }
    const xref = pdf.length;
    pdf += 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\n';
    pdf += `startxref\n${xref}\n%%EOF`;

    const path = `${RNFS.DocumentDirectoryPath}/${fileName}.pdf`;
    await RNFS.writeFile(path, pdf, 'ascii');
    return path;
  };

  const exportOneRequestExcel = async request => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toExcelRowsForRequest(request)), 'Request');
    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const path = `${RNFS.DocumentDirectoryPath}/material_request_${request.requestId}.xlsx`;
    await RNFS.writeFile(path, base64, 'base64');
    return path;
  };

  const exportAllRequestsExcel = async () => {
    const workbook = XLSX.utils.book_new();
    const sorted = [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sorted.forEach((request, index) => {
      const rows = toExcelRowsForRequest(request);
      const sheet = `R${index + 1}_${new Date(request.createdAt).toISOString().slice(0, 10)}`;
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheet.slice(0, 30));
    });

    const summary = [
      {
        Project: projectName,
        Requests: requests.length,
        ...(canRevealPrices ? { 'Grand Total': allRequestsGrandTotal.toFixed(2) } : {}),
      },
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const path = `${RNFS.DocumentDirectoryPath}/material_requests_all_${mode}_${projectId}.xlsx`;
    await RNFS.writeFile(path, base64, 'base64');
    return path;
  };

  const exportOneRequestPdf = async request => {
    const lines = [
      `Material Request - ${projectName}`,
      `Date: ${formatDateTime(request.createdAt)}`,
      '----------------------------------------',
      'Sl No | Item | Nos' + (canRevealPrices ? ' | Price | Each Total' : ''),
      '----------------------------------------',
    ];

    (request.items || []).forEach((item, index) => {
      const base = `${index + 1} | ${item.materialName} | ${item.quantity}`;
      lines.push(canRevealPrices ? `${base} | ${item.price} | ${item.total}` : base);
    });

    if (canRevealPrices) {
      lines.push('----------------------------------------');
      lines.push(`Total: ${requestGrandTotal(request).toFixed(2)}`);
    }

    return createPdfFromLines(lines, `material_request_${request.requestId}`);
  };

  const exportAllRequestsPdf = async () => {
    const lines = [
      `All Material Requests - ${projectName}`,
      `Total Requests: ${requests.length}`,
      ...(canRevealPrices ? [`Grand Total: ${allRequestsGrandTotal.toFixed(2)}`] : []),
      '========================================',
    ];

    const sorted = [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    sorted.forEach((request, idx) => {
      lines.push(`Request ${idx + 1} | ${formatDateTime(request.createdAt)}`);
      (request.items || []).forEach((item, index) => {
        const base = `${index + 1}. ${item.materialName} x${item.quantity}`;
        lines.push(canRevealPrices ? `${base} @${item.price} = ${item.total}` : base);
      });
      if (canRevealPrices) {
        lines.push(`Request Total: ${requestGrandTotal(request).toFixed(2)}`);
      }
      lines.push('----------------------------------------');
    });

    return createPdfFromLines(lines, `material_requests_all_${mode}_${projectId}`);
  };

  const exportFile = async option => {
    try {
      setShowExportModal(false);
      let path = '';

      if (option === 'single_excel') {
        if (!viewRequest) {
          Alert.alert('Info', 'Open a request first to export single request');
          return;
        }
        path = await exportOneRequestExcel(viewRequest);
      } else if (option === 'single_pdf') {
        if (!viewRequest) {
          Alert.alert('Info', 'Open a request first to export single request');
          return;
        }
        path = await exportOneRequestPdf(viewRequest);
      } else if (option === 'all_excel') {
        path = await exportAllRequestsExcel();
      } else if (option === 'all_pdf') {
        path = await exportAllRequestsPdf();
      }

      Alert.alert('Export Complete', `Saved to:\n${path}`);
    } catch (error) {
      Alert.alert('Error', `Failed to export: ${error.message}`);
    }
  };

  const renderRequestCard = ({ item, index }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => setViewRequest(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.requestIndex}>Request #{requests.length - index}</Text>
      <Text style={styles.requestDate}>{formatDateTime(item.createdAt)}</Text>
      <Text style={styles.requestMeta}>{(item.items || []).length} item(s)</Text>
      {canRevealPrices ? (
        <Text style={styles.requestTotal}>Total: {requestGrandTotal(item).toFixed(2)}</Text>
      ) : (
        <Text style={styles.requestTotalHidden}>Total: Hidden</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Requests</Text>
        <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
          <Download color={COLORS.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.projectName}>{projectName}</Text>
        <Text style={styles.modeText}>{mode === 'quick' ? 'Quick Project' : 'Project'}</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show Prices</Text>
          <Switch value={showPrices} onValueChange={toggleShowPrices} />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addBtnText}>Add Request</Text>
        </TouchableOpacity>

        <FlatList
          data={requests}
          keyExtractor={item => item.requestId}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No requests yet</Text>}
        />
      </View>

      <Modal transparent visible={showUnlockModal} animationType="fade" onRequestClose={() => setShowUnlockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Info</Text>
              <TouchableOpacity onPress={() => setShowUnlockModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleUnlockMessageTap} activeOpacity={0.85}>
              <Text style={styles.unlockMessage}>{unlockMessage}</Text>
            </TouchableOpacity>
            <Text style={styles.tapHint}>Tap message 6 times to unlock prices ({tapCount}/6)</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUnlockModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showAddModal} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.largeModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Material Request</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={materials}
              keyExtractor={item => item.materialId}
              renderItem={({ item }) => {
                const selected = selectedMaterialIds.includes(item.materialId);
                return (
                  <View style={styles.materialRow}>
                    <TouchableOpacity style={styles.materialCheckbox} onPress={() => toggleMaterial(item.materialId)}>
                      {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                      <Text style={styles.materialName}>{item.name}</Text>
                    </TouchableOpacity>
                    <View style={styles.materialRight}>
                      {canRevealPrices ? <Text style={styles.unitPrice}>@ {Number(item.approximatePrice || 0).toFixed(2)}</Text> : null}
                      <TextInput
                        style={styles.qtyInput}
                        placeholder="Nos"
                        placeholderTextColor={COLORS.gray}
                        keyboardType="number-pad"
                        value={quantityByMaterial[item.materialId] || ''}
                        onChangeText={value =>
                          setQuantityByMaterial(prev => ({ ...prev, [item.materialId]: value }))
                        }
                      />
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No materials in pool</Text>}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRequest}>
                <Text style={styles.saveBtnText}>Save Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!viewRequest} animationType="fade" onRequestClose={() => setViewRequest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.largeModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Detail</Text>
              <TouchableOpacity onPress={() => setViewRequest(null)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailDate}>{viewRequest ? formatDateTime(viewRequest.createdAt) : ''}</Text>

            <ScrollView>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeadText, styles.colSerial]}>Sl</Text>
                <Text style={[styles.tableHeadText, styles.colItem]}>Item</Text>
                <Text style={[styles.tableHeadText, styles.colQty]}>Nos</Text>
                {canRevealPrices ? <Text style={[styles.tableHeadText, styles.colPrice]}>Price</Text> : null}
                {canRevealPrices ? <Text style={[styles.tableHeadText, styles.colTotal]}>Each Total</Text> : null}
              </View>

              {(viewRequest?.items || []).map((item, index) => (
                <View key={`${item.materialId}_${index}`} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, styles.colSerial]}>{index + 1}</Text>
                  <Text style={[styles.tableCellText, styles.colItem]}>{item.materialName}</Text>
                  <Text style={[styles.tableCellText, styles.colQty]}>{item.quantity}</Text>
                  {canRevealPrices ? <Text style={[styles.tableCellText, styles.colPrice]}>{item.price}</Text> : null}
                  {canRevealPrices ? <Text style={[styles.tableCellText, styles.colTotal]}>{item.total}</Text> : null}
                </View>
              ))}

              {canRevealPrices ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Total</Text>
                  <Text style={styles.totalText}>{viewRequest ? requestGrandTotal(viewRequest).toFixed(2) : '0.00'}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showExportModal} animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.exportBtn} onPress={() => exportFile('single_excel')}>
              <Text style={styles.exportBtnText}>Current Request - Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportFile('single_pdf')}>
              <Text style={styles.exportBtnText}>Current Request - PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportFile('all_excel')}>
              <Text style={styles.exportBtnText}>All Requests - Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportFile('all_pdf')}>
              <Text style={styles.exportBtnText}>All Requests - PDF</Text>
            </TouchableOpacity>
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
  content: { flex: 1, padding: 16 },
  projectName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modeText: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  toggleRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  addBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addBtnText: { color: COLORS.white, marginLeft: 8, fontWeight: '700', fontSize: 14 },
  listContent: { paddingTop: 12, paddingBottom: 18 },
  requestCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestIndex: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  requestDate: { color: COLORS.textLight, fontSize: 12, marginTop: 4 },
  requestMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  requestTotal: { marginTop: 6, color: COLORS.primary, fontWeight: '700' },
  requestTotalHidden: { marginTop: 6, color: COLORS.textLight, fontWeight: '700' },
  emptyText: { color: COLORS.textLight, textAlign: 'center', marginTop: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '80%',
  },
  largeModal: { maxHeight: '86%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  unlockMessage: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tapHint: { marginTop: 10, color: COLORS.textLight, fontSize: 12 },
  cancelBtn: { height: 36, justifyContent: 'center', paddingHorizontal: 12 },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  saveBtn: {
    marginLeft: 8,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  materialCheckbox: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  materialName: { marginLeft: 8, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  materialRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitPrice: { color: COLORS.textLight, fontSize: 12 },
  qtyInput: {
    width: 58,
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    color: COLORS.text,
    textAlign: 'center',
  },
  detailDate: { marginTop: 8, color: COLORS.textLight, fontSize: 12 },
  tableHeader: {
    flexDirection: 'row',
    marginTop: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  tableHeadText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 8,
  },
  tableCellText: { color: COLORS.text, fontSize: 12 },
  colSerial: { width: 36 },
  colItem: { flex: 1 },
  colQty: { width: 44, textAlign: 'center' },
  colPrice: { width: 60, textAlign: 'right' },
  colTotal: { width: 74, textAlign: 'right' },
  totalRow: {
    marginTop: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalText: { color: COLORS.text, fontWeight: '700' },
  exportBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exportBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});

export default MaterialRequestsScreen;
