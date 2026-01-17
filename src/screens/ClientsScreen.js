import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Search,
  Plus,
  Building2,
  Phone,
  MapPin,
  Filter,
  Users,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getClientsByOrg,
  createClient,
  deleteClient,
} from '../services/storageService';

const ClientsScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [places, setPlaces] = useState([]);

  // Add client form states
  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients, selectedFilter]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientList = await getClientsByOrg(session.orgId);
      setClients(clientList);

      // Extract unique places for filter
      const uniquePlaces = [
        ...new Set(
          clientList
            .map(c => c.address?.trim())
            .filter(addr => addr && addr.length > 0),
        ),
      ];
      setPlaces(uniquePlaces);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        client =>
          client.name?.toLowerCase().includes(query) ||
          client.contactNumber?.toLowerCase().includes(query) ||
          client.address?.toLowerCase().includes(query),
      );
    }

    // Apply place filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(client => client.address === selectedFilter);
    }

    setFilteredClients(filtered);
  };

  const handleAddClient = async () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    try {
      setSaving(true);
      const newClient = await createClient({
        orgId: session.orgId,
        name: clientName.trim(),
        contactNumber: contactNumber.trim(),
        address: address.trim(),
        createdBy: session.userId,
      });

      if (newClient) {
        Alert.alert('Success', 'Client added successfully');
        resetForm();
        setShowAddModal(false);
        await loadClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = (clientId, clientName) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${clientName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId);
              Alert.alert('Success', 'Client deleted successfully');
              await loadClients();
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setClientName('');
    setContactNumber('');
    setAddress('');
  };

  const applyFilter = filter => {
    setSelectedFilter(filter);
    setShowFilterModal(false);
  };

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
        <Text style={styles.headerTitle}>All Clients</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={COLORS.gray} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter color={COLORS.primary} size={20} />
        </TouchableOpacity>
      </View>

      {/* Active Filter Indicator */}
      {selectedFilter !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            Filtered by: {selectedFilter}
          </Text>
          <TouchableOpacity onPress={() => setSelectedFilter('all')}>
            <X color={COLORS.primary} size={16} />
          </TouchableOpacity>
        </View>
      )}

      {/* Client List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users color={COLORS.gray} size={64} />
          <Text style={styles.emptyTitle}>No Clients Found</Text>
          <Text style={styles.emptyText}>
            {searchQuery || selectedFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Add your first client to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.clientList}
          showsVerticalScrollIndicator={false}
        >
          {filteredClients.map(client => (
            <View key={client.clientId} style={styles.clientCard}>
              <View style={styles.clientHeader}>
                <View style={styles.clientIcon}>
                  <Building2 color={COLORS.primary} size={24} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  {client.contactNumber && (
                    <View style={styles.clientDetail}>
                      <Phone color={COLORS.textLight} size={14} />
                      <Text style={styles.clientDetailText}>
                        {client.contactNumber}
                      </Text>
                    </View>
                  )}
                  {client.address && (
                    <View style={styles.clientDetail}>
                      <MapPin color={COLORS.textLight} size={14} />
                      <Text style={styles.clientDetailText}>
                        {client.address}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteClient(client.clientId, client.name)}
              >
                <X color={COLORS.danger} size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Client Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Client/Company Name *</Text>
              <View style={styles.inputContainer}>
                <Building2 color={COLORS.gray} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter client name"
                  placeholderTextColor={COLORS.gray}
                  value={clientName}
                  onChangeText={setClientName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Contact Number</Text>
              <View style={styles.inputContainer}>
                <Phone color={COLORS.gray} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter contact number"
                  placeholderTextColor={COLORS.gray}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.label}>Address</Text>
              <View style={styles.inputContainerMultiline}>
                <MapPin color={COLORS.gray} size={20} style={styles.iconTop} />
                <TextInput
                  style={styles.inputMultiline}
                  placeholder="Enter address"
                  placeholderTextColor={COLORS.gray}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  saving && styles.submitButtonDisabled,
                ]}
                onPress={handleAddClient}
                disabled={saving}
              >
                <Text style={styles.submitButtonText}>
                  {saving ? 'Adding...' : 'Add Client'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Place</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedFilter === 'all' && styles.filterOptionSelected,
                ]}
                onPress={() => applyFilter('all')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === 'all' && styles.filterOptionTextSelected,
                  ]}
                >
                  All Places
                </Text>
              </TouchableOpacity>

              {places.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.filterOption,
                    selectedFilter === place && styles.filterOptionSelected,
                  ]}
                  onPress={() => applyFilter(place)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === place &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {place}
                  </Text>
                </TouchableOpacity>
              ))}

              {places.length === 0 && (
                <View style={styles.emptyFilterContainer}>
                  <Text style={styles.emptyFilterText}>
                    No locations available
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Plus color={COLORS.white} size={28} />
      </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '15',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  activeFilterText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 175,
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
    textAlign: 'center',
    marginTop: 8,
  },
  clientList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clientDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputContainerMultiline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  inputMultiline: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
  },
  iconTop: {
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  filterOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyFilterContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyIcon: {
    paddingBottom: 55,
  },
});

export default ClientsScreen;
