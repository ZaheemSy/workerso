import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { X, Search, User, ShieldCheck, Users } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { getUsersByOrg } from '../services/storageService';

const AdminsAndWorkersScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [activeTab, searchQuery, allUsers]);

  const loadUsers = async () => {
    try {
      const users = await getUsersByOrg(session.orgId);
      // Filter out super admins, only show admins and workers
      const filteredByRole = users.filter(
        user => user.role === ROLES.ADMIN || user.role === ROLES.WORKER
      );
      setAllUsers(filteredByRole);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...allUsers];

    // Filter by tab
    if (activeTab === 'admins') {
      filtered = filtered.filter(user => user.role === ROLES.ADMIN);
    } else if (activeTab === 'workers') {
      filtered = filtered.filter(user => user.role === ROLES.WORKER);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const getUserIcon = (role) => {
    if (role === ROLES.ADMIN) {
      return <ShieldCheck color={COLORS.primary} size={20} />;
    }
    return <User color={COLORS.secondary} size={20} />;
  };

  const renderUserCard = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserDetail', { userId: item.userId })}
      activeOpacity={0.7}
    >
      <View style={styles.userIconContainer}>
        {getUserIcon(item.role)}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.roleContainer}>
        <Text style={[
          styles.roleText,
          item.role === ROLES.ADMIN ? styles.adminRole : styles.workerRole
        ]}>
          {ROLE_LABELS[item.role]}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const tabs = [
    { key: 'all', label: 'All', count: allUsers.length },
    { key: 'admins', label: 'Admins', count: allUsers.filter(u => u.role === ROLES.ADMIN).length },
    { key: 'workers', label: 'Workers', count: allUsers.filter(u => u.role === ROLES.WORKER).length },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admins and Workers</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username, or email..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.activeTabBadge,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.activeTabBadgeText,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* User List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No users found' : 'No users yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim()
                ? 'Try a different search term'
                : 'Add admins and workers to get started'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.userId}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
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
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginRight: 6,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: COLORS.white + '30',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabBadgeText: {
    color: COLORS.white,
  },
  listContainer: {
    paddingBottom: 16,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  roleContainer: {
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminRole: {
    backgroundColor: COLORS.primary + '15',
    color: COLORS.primary,
  },
  workerRole: {
    backgroundColor: COLORS.secondary + '15',
    color: COLORS.secondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AdminsAndWorkersScreen;
