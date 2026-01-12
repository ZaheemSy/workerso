import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import {
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  FolderOpen,
  Plus,
  Calendar,
  Timer,
  Coffee,
  RefreshCw,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserById,
  updateUser,
  getUsersByAdmin,
  getUsers,
  getWorkLogsByUser,
  getProjectsByOrg,
  getGroupsByOrg,
  getDesignationById,
  createWorkLog,
} from '../services/storageService';

const UserDetailScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const { session } = useAuth();
  const [user, setUser] = useState(null);
  const [requiresClockIn, setRequiresClockIn] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // New states for enhanced features
  const [totalHours, setTotalHours] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [workerGroups, setWorkerGroups] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [designation, setDesignation] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Work log modal states
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [breakDuration, setBreakDuration] = useState('');
  const [loggingWork, setLoggingWork] = useState(false);

  // Admin assignment modal states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [powerLevel2Users, setPowerLevel2Users] = useState([]);
  const [superAdminData, setSuperAdminData] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [reassigningAdmin, setReassigningAdmin] = useState(false);

  // Worker Groups and Projects modal states
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showEmployeesListModal, setShowEmployeesListModal] = useState(false);

  useEffect(() => {
    loadUserDetails();
  }, []);

  const loadUserDetails = async () => {
    try {
      const userDetails = await getUserById(userId);
      setUser(userDetails);
      setRequiresClockIn(userDetails?.requiresClockIn || false);

      // Load designation
      if (userDetails?.designationId) {
        const des = await getDesignationById(userDetails.designationId);
        setDesignation(des);
      }

      // If user is a worker and has an admin, load the admin details
      if (userDetails?.role === ROLES.WORKER && userDetails?.adminId) {
        const admin = await getUserById(userDetails.adminId);
        setAssignedAdmin(admin);
      }

      // If user is an admin, load their workers
      if (userDetails?.role === ROLES.ADMIN) {
        await loadWorkers(userId);
      }

      // Load worker-specific data
      if (userDetails?.role === ROLES.WORKER) {
        await loadWorkerStats(userId);
        await loadWorkerGroups(userId, userDetails.orgId);
        await loadAssignedProjects(userId, userDetails.orgId);
      }

      // Load all projects for work log modal
      if (userDetails?.orgId) {
        const projects = await getProjectsByOrg(userDetails.orgId);
        setAllProjects(projects);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async adminId => {
    try {
      const allUsers = await getUsers();
      const adminWorkers = allUsers.filter(
        u => u.role === ROLES.WORKER && u.adminId === adminId,
      );
      setWorkers(adminWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadWorkerStats = async workerId => {
    try {
      // Get all work logs for this worker
      const allWorkLogs = await getWorkLogsByUser(workerId);

      // Calculate total hours
      let hours = 0;
      const projectSet = new Set();

      allWorkLogs.forEach(log => {
        if (log.hours) {
          hours += parseFloat(log.hours);
        }
        if (log.projectId) {
          projectSet.add(log.projectId);
        }
      });

      setTotalHours(hours);
      setTotalProjects(projectSet.size);
    } catch (error) {
      console.error('Error loading worker stats:', error);
    }
  };

  const loadWorkerGroups = async (workerId, orgId) => {
    try {
      const groups = await getGroupsByOrg(orgId);
      const workerInGroups = groups.filter(
        group => group.workers && group.workers.includes(workerId),
      );
      setWorkerGroups(workerInGroups);
    } catch (error) {
      console.error('Error loading worker groups:', error);
    }
  };

  const loadAssignedProjects = async (workerId, orgId) => {
    try {
      const projects = await getProjectsByOrg(orgId);
      const workerProjects = projects.filter(
        project => project.workers && project.workers.includes(workerId),
      );
      setAssignedProjects(workerProjects);
    } catch (error) {
      console.error('Error loading assigned projects:', error);
    }
  };

  const extractPowerLevel2Roles = hierarchy => {
    // Get direct children of root (Power Level 2)
    if (!hierarchy || !hierarchy.children) return [];

    const powerLevel2Roles = [];
    hierarchy.children.forEach(child => {
      // Exclude placeholder roles
      if (child.id !== 'root' && !child.name.includes('Role-')) {
        powerLevel2Roles.push({
          id: child.id,
          name: child.name,
        });
      }
    });

    return powerLevel2Roles;
  };

  const loadPowerLevel2Users = async () => {
    try {
      // Load hierarchy
      const key = `hierarchy_${user.orgId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return [];

      const hierarchy = JSON.parse(stored);
      const powerLevel2Roles = extractPowerLevel2Roles(hierarchy);

      if (powerLevel2Roles.length === 0) return [];

      // Load all users
      const allUsers = await getUsers();

      // Find users with Power Level 2 roles
      const power2Users = [];
      for (const pl2Role of powerLevel2Roles) {
        const usersWithRole = allUsers.filter(
          u =>
            u.orgId === user.orgId &&
            u.extraDetails?.hierarchyRole === pl2Role.name,
        );

        for (const userData of usersWithRole) {
          // Load designation for this user
          let designationName = 'No Designation';
          if (userData.designationId) {
            const des = await getDesignationById(userData.designationId);
            if (des) designationName = des.name;
          }

          power2Users.push({
            userId: userData.userId,
            name: userData.name,
            username: userData.username,
            role: pl2Role.name,
            designation: designationName,
            systemRole: userData.role,
          });
        }
      }

      return power2Users;
    } catch (error) {
      console.error('Error loading Power Level 2 users:', error);
      return [];
    }
  };

  const loadSuperAdminData = async () => {
    try {
      const allUsers = await getUsers();
      const superAdmin = allUsers.find(
        u => u.role === ROLES.SUPER_ADMIN && u.orgId === user.orgId,
      );

      if (superAdmin) {
        let designationName = null;
        if (superAdmin.designationId) {
          const des = await getDesignationById(superAdmin.designationId);
          if (des) designationName = des.name;
        }

        return {
          userId: superAdmin.userId,
          name: superAdmin.name,
          designation: designationName,
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading Super Admin:', error);
      return null;
    }
  };

  const loadAdmins = async () => {
    try {
      const allUsers = await getUsers();
      const admins = allUsers.filter(
        u => u.role === ROLES.ADMIN && u.orgId === user.orgId,
      );

      // Load designation for each admin
      const adminsWithDesignations = await Promise.all(
        admins.map(async admin => {
          let designationName = 'No Designation';
          let roleName = 'Admin';

          if (admin.designationId) {
            const des = await getDesignationById(admin.designationId);
            if (des) designationName = des.name;
          }

          if (admin.extraDetails?.hierarchyRole) {
            roleName = admin.extraDetails.hierarchyRole;
          }

          return {
            ...admin,
            designation: designationName,
            hierarchyRole: roleName,
          };
        }),
      );

      setAvailableAdmins(adminsWithDesignations);
      return adminsWithDesignations;
    } catch (error) {
      console.error('Error loading admins:', error);
      Alert.alert('Error', 'Failed to load admins');
      return [];
    }
  };

  const handleOpenAdminModal = async () => {
    // Load Power Level 2 users
    const pl2Users = await loadPowerLevel2Users();
    setPowerLevel2Users(pl2Users);

    // Load all admins (deduplication happens at render time)
    await loadAdmins();

    // Load Super Admin data
    const saData = await loadSuperAdminData();
    setSuperAdminData(saData);

    setSelectedAdminId(user.adminId || null);
    setShowAdminModal(true);
  };

  const handleReassignAdmin = async () => {
    if (selectedAdminId === user.adminId) {
      setShowAdminModal(false);
      return;
    }

    setReassigningAdmin(true);
    try {
      await updateUser(userId, { adminId: selectedAdminId });

      // Reload user details
      const updatedUser = await getUserById(userId);
      setUser(updatedUser);

      // Reload assigned admin
      if (selectedAdminId) {
        const admin = await getUserById(selectedAdminId);
        setAssignedAdmin(admin);
      } else {
        setAssignedAdmin(null);
      }

      setShowAdminModal(false);

      const adminName = selectedAdminId
        ? availableAdmins.find(a => a.userId === selectedAdminId)?.name
        : 'Super Admin';

      Alert.alert('Success', `Worker reassigned to ${adminName}`);
    } catch (error) {
      console.error('Error reassigning admin:', error);
      Alert.alert('Error', 'Failed to reassign admin');
    } finally {
      setReassigningAdmin(false);
    }
  };

  const handleToggleClockIn = async value => {
    try {
      setRequiresClockIn(value);
      await updateUser(userId, { requiresClockIn: value });
      Alert.alert(
        'Success',
        `Clock-in requirement ${value ? 'enabled' : 'disabled'} for ${
          user.name
        }`,
      );
    } catch (error) {
      console.error('Error updating clock-in requirement:', error);
      Alert.alert('Error', 'Failed to update clock-in requirement');
      setRequiresClockIn(!value);
    }
  };

  const handleLogWork = async () => {
    // Prevent Super Admin from logging work for workers assigned to admins
    if (session.role === ROLES.SUPER_ADMIN && user.adminId) {
      Alert.alert(
        'Access Denied',
        `This worker is assigned to ${
          assignedAdmin?.name || 'an admin'
        }. Only the assigned admin can log work hours for this worker.`,
      );
      return;
    }

    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    if (!startTime) {
      Alert.alert('Error', 'Start time is required');
      return;
    }

    setLoggingWork(true);
    try {
      let calculatedHours = 0;

      if (durationHours || durationMinutes) {
        // Use manual duration
        const hours = parseInt(durationHours || '0');
        const minutes = parseInt(durationMinutes || '0');
        calculatedHours = hours + minutes / 60;
      } else if (endTime) {
        // Calculate from start and end time
        const diffMs = endTime.getTime() - startTime.getTime();
        calculatedHours = diffMs / (1000 * 60 * 60);
      } else {
        Alert.alert('Error', 'Please provide either end time or duration');
        setLoggingWork(false);
        return;
      }

      // Subtract break duration if provided
      if (breakDuration) {
        const breakMinutes = parseInt(breakDuration);
        if (!isNaN(breakMinutes)) {
          calculatedHours -= breakMinutes / 60;
        }
      }

      if (calculatedHours <= 0) {
        Alert.alert('Error', 'Work duration must be positive');
        setLoggingWork(false);
        return;
      }

      // Create work log
      const workLogData = {
        userId: userId,
        orgId: user.orgId,
        projectId: selectedProject.projectId,
        date: startDate.toISOString().split('T')[0],
        startTime: startTime.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        hours: calculatedHours.toFixed(2),
        breakDuration: breakDuration ? parseInt(breakDuration) : 0,
        loggedBy: session.userId,
      };

      await createWorkLog(workLogData);

      Alert.alert(
        'Success',
        `Work log created: ${calculatedHours.toFixed(2)} hours`,
      );

      // Reset modal
      setShowWorkLogModal(false);
      setSelectedProject(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setStartTime(new Date());
      setEndTime(null);
      setDurationHours('');
      setDurationMinutes('');
      setBreakDuration('');

      // Reload stats
      await loadWorkerStats(userId);
    } catch (error) {
      console.error('Error logging work:', error);
      Alert.alert('Error', 'Failed to log work');
    } finally {
      setLoggingWork(false);
    }
  };

  const formatDate = date => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = date => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card - Redesigned with Accordion */}
        <View style={styles.card}>
          {/* Main Profile Section - Always Visible */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarCircle,
                  user.role === ROLES.ADMIN
                    ? styles.avatarAdmin
                    : styles.avatarWorker,
                ]}
              >
                {user.role === ROLES.ADMIN ? (
                  <ShieldCheck color={COLORS.primary} size={40} />
                ) : (
                  <User color={COLORS.secondary} size={40} />
                )}
              </View>
            </View>

            <View style={styles.profileInfoSection}>
              <Text style={styles.profileName}>{user.name}</Text>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.roleBadgeNew,
                    user.role === ROLES.ADMIN
                      ? styles.adminBadgeNew
                      : styles.workerBadgeNew,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeTextNew,
                      user.role === ROLES.ADMIN
                        ? styles.adminBadgeTextNew
                        : styles.workerBadgeTextNew,
                    ]}
                  >
                    {user.extraDetails?.hierarchyRole || ROLE_LABELS[user.role]}
                  </Text>
                </View>

                {designation && (
                  <View style={styles.designationBadgeNew}>
                    <Briefcase color={COLORS.primary} size={14} />
                    <Text style={styles.designationTextNew}>
                      {designation.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Accordion Toggle Button */}
          <TouchableOpacity
            style={styles.accordionToggle}
            onPress={() => setShowUserDetails(!showUserDetails)}
            activeOpacity={0.7}
          >
            <Text style={styles.accordionToggleText}>
              {showUserDetails ? 'Hide Details' : 'Show Details'}
            </Text>
            {showUserDetails ? (
              <ChevronUp color={COLORS.primary} size={20} />
            ) : (
              <ChevronDown color={COLORS.primary} size={20} />
            )}
          </TouchableOpacity>

          {/* Collapsible Details Section */}
          {showUserDetails && (
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <User color={COLORS.primary} size={18} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>@{user.username}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Mail color={COLORS.primary} size={18} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{user.email}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <View style={styles.detailIconContainer}>
                  <Phone color={COLORS.primary} size={18} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{user.phone}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Log Work Hours Button (for Workers) */}
        {user.role === ROLES.WORKER && (
          <TouchableOpacity
            style={styles.logWorkButtonTop}
            onPress={() => setShowWorkLogModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.logWorkButtonContent}>
              <View style={styles.logWorkIconWrapper}>
                <Clock color={COLORS.white} size={24} />
              </View>
              <View style={styles.logWorkTextWrapper}>
                <Text style={styles.logWorkButtonTitle}>Log Work Hours</Text>
                <Text style={styles.logWorkButtonSubtitle}>
                  Track time for projects
                </Text>
              </View>
            </View>
            <Plus color={COLORS.white} size={24} />
          </TouchableOpacity>
        )}

        {/* Stats Cards (only for workers) */}
        {user.role === ROLES.WORKER && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Clock color={COLORS.primary} size={24} />
              </View>
              <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <FolderOpen color={COLORS.secondary} size={24} />
              </View>
              <Text style={styles.statValue}>{totalProjects}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        )}

        {/* Worker Groups Button (for Workers) */}
        {user.role === ROLES.WORKER && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowGroupsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={styles.actionIconContainer}>
                <Users color={COLORS.primary} size={24} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionCardTitle}>Worker Groups</Text>
                <Text style={styles.actionCardSubtitle}>
                  {workerGroups.length === 0
                    ? 'No groups assigned'
                    : `${workerGroups.length} group${
                        workerGroups.length !== 1 ? 's' : ''
                      }`}
                </Text>
              </View>
            </View>
            <ChevronDown
              color={COLORS.gray}
              size={20}
              style={{ transform: [{ rotate: '-90deg' }] }}
            />
          </TouchableOpacity>
        )}

        {/* Assigned Projects Button (for Workers) */}
        {user.role === ROLES.WORKER && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowProjectsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: COLORS.secondary + '15' },
                ]}
              >
                <FolderOpen color={COLORS.secondary} size={24} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionCardTitle}>Assigned Projects</Text>
                <Text style={styles.actionCardSubtitle}>
                  {assignedProjects.length === 0
                    ? 'No projects assigned'
                    : `${assignedProjects.length} project${
                        assignedProjects.length !== 1 ? 's' : ''
                      }`}
                </Text>
              </View>
            </View>
            <ChevronDown
              color={COLORS.gray}
              size={20}
              style={{ transform: [{ rotate: '-90deg' }] }}
            />
          </TouchableOpacity>
        )}

        {/* Assigned Admin (for Workers) */}
        {user.role === ROLES.WORKER && assignedAdmin && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldCheck color={COLORS.primary} size={24} />
              <Text style={styles.cardTitle}>Assigned Admin</Text>
              {session.role === ROLES.SUPER_ADMIN && (
                <TouchableOpacity
                  style={styles.changeBadge}
                  onPress={handleOpenAdminModal}
                  activeOpacity={0.7}
                >
                  <RefreshCw color={COLORS.white} size={12} />
                  <Text style={styles.changeBadgeText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.adminAssignmentCard}>
              <View style={styles.workerIconContainer}>
                <ShieldCheck color={COLORS.primary} size={18} />
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{assignedAdmin.name}</Text>
                <Text style={styles.workerUsername}>
                  @{assignedAdmin.username}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Direct Under Super Admin (for Workers with no admin) */}
        {user.role === ROLES.WORKER && !assignedAdmin && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldCheck color={COLORS.primary} size={24} />
              <Text style={styles.cardTitle}>Reporting Structure</Text>
              {session.role === ROLES.SUPER_ADMIN && (
                <TouchableOpacity
                  style={styles.changeBadge}
                  onPress={handleOpenAdminModal}
                  activeOpacity={0.7}
                >
                  <RefreshCw color={COLORS.white} size={12} />
                  <Text style={styles.changeBadgeText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.directReportText}>
              Reports directly to Super Admin
            </Text>
          </View>
        )}

        {/* Clock-In Requirement Toggle */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Clock color={COLORS.primary} size={24} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Require Clock In/Out</Text>
                <Text style={styles.settingSubtitle}>
                  {requiresClockIn
                    ? `${user.name} must clock in and out daily`
                    : `${user.name} is not required to clock in`}
                </Text>
              </View>
            </View>
            <Switch
              value={requiresClockIn}
              onValueChange={handleToggleClockIn}
              trackColor={{
                false: COLORS.lightGray,
                true: COLORS.primary + '50',
              }}
              thumbColor={requiresClockIn ? COLORS.primary : COLORS.gray}
            />
          </View>
        </View>

        {/* Workers List for Admins */}
        {user.role === ROLES.ADMIN && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setShowEmployeesListModal(true)}
              activeOpacity={0.7}
            >
              <Users color={COLORS.secondary} size={24} />
              <Text style={styles.cardTitle}>Employees under {user.name}</Text>
              <ChevronDown
                color={COLORS.gray}
                size={20}
                style={{ transform: [{ rotate: '-90deg' }] }}
              />
            </TouchableOpacity>

            {workers.length === 0 ? (
              <View style={styles.emptyState}>
                <Users color={COLORS.gray} size={40} />
                <Text style={styles.emptyText}>No workers Assigned</Text>
                <Text style={styles.emptySubtext}>
                  Workers will appear here when assigned to this admin
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.workersCount}>
                  {workers.length} worker{workers.length !== 1 ? 's' : ''}{' '}
                  assigned
                </Text>
                {workers.map(worker => (
                  <View key={worker.userId} style={styles.workerItem}>
                    <View style={styles.workerIconContainer}>
                      <User color={COLORS.secondary} size={18} />
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <Text style={styles.workerUsername}>
                        @{worker.username}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          {user.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Work Log Modal */}
      <Modal
        visible={showWorkLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Work Hours</Text>
              <TouchableOpacity onPress={() => setShowWorkLogModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Project Selection Button */}
              <Text style={styles.sectionTitle}>Project</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowProjectModal(true)}
                activeOpacity={0.7}
              >
                <FolderOpen
                  color={selectedProject ? COLORS.secondary : COLORS.gray}
                  size={20}
                />
                <Text
                  style={[
                    styles.selectButtonText,
                    selectedProject && styles.selectButtonTextSelected,
                  ]}
                >
                  {selectedProject
                    ? selectedProject.projectName
                    : 'Select Project'}
                </Text>
              </TouchableOpacity>

              {/* Row 1: Start Date and Start Time */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.sectionTitle}>Start Date *</Text>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Calendar color={COLORS.primary} size={18} />
                    <Text style={styles.smallButtonText}>
                      {formatDate(startDate)}
                    </Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowStartDatePicker(Platform.OS === 'ios');
                        if (date) {
                          setStartDate(date);
                          setEndDate(date); // Auto-set end date to same as start date
                        }
                      }}
                    />
                  )}
                </View>

                <View style={styles.dateTimeColumn}>
                  <Text style={styles.sectionTitle}>Start Time *</Text>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Timer color={COLORS.primary} size={18} />
                    <Text style={styles.smallButtonText}>
                      {formatTime(startTime)}
                    </Text>
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display="default"
                      onChange={(event, time) => {
                        setShowStartTimePicker(Platform.OS === 'ios');
                        if (time) setStartTime(time);
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Row 2: End Date with Change button */}
              <View style={styles.endDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>End Date</Text>
                  <View style={styles.endDateDisplay}>
                    <Calendar color={COLORS.textLight} size={18} />
                    <Text style={styles.endDateText}>
                      {formatDate(endDate)}
                    </Text>
                    <TouchableOpacity
                      style={styles.changeButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowEndDatePicker(Platform.OS === 'ios');
                        if (date) setEndDate(date);
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Row 3: End Time OR Duration */}
              <View style={styles.orRow}>
                <TouchableOpacity
                  style={[
                    styles.orButton,
                    endTime && styles.orButtonSelected,
                    (durationHours || durationMinutes) &&
                      styles.orButtonDisabled,
                  ]}
                  onPress={() => {
                    if (!durationHours && !durationMinutes) {
                      setShowEndTimePicker(true);
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={!!(durationHours || durationMinutes)}
                >
                  <Timer
                    color={
                      endTime
                        ? COLORS.white
                        : durationHours || durationMinutes
                        ? COLORS.gray
                        : COLORS.primary
                    }
                    size={18}
                  />
                  <Text
                    style={[
                      styles.orButtonText,
                      endTime && styles.orButtonTextSelected,
                      (durationHours || durationMinutes) &&
                        styles.orButtonTextDisabled,
                    ]}
                  >
                    {endTime ? formatTime(endTime) : 'End Time'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.orText}>or</Text>

                <TouchableOpacity
                  style={[
                    styles.orButton,
                    (durationHours || durationMinutes) &&
                      styles.orButtonSelected,
                    endTime && styles.orButtonDisabled,
                  ]}
                  onPress={() => {
                    if (!endTime) {
                      setShowDurationModal(true);
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={!!endTime}
                >
                  <Clock
                    color={
                      durationHours || durationMinutes
                        ? COLORS.white
                        : endTime
                        ? COLORS.gray
                        : COLORS.primary
                    }
                    size={18}
                  />
                  <Text
                    style={[
                      styles.orButtonText,
                      (durationHours || durationMinutes) &&
                        styles.orButtonTextSelected,
                      endTime && styles.orButtonTextDisabled,
                    ]}
                  >
                    {durationHours || durationMinutes
                      ? `${durationHours || '00'}:${durationMinutes || '00'}`
                      : 'Duration'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Time Picker (shown inline) */}
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, time) => {
                    setShowEndTimePicker(Platform.OS === 'ios');
                    if (time) {
                      setEndTime(time);
                      setDurationHours('');
                      setDurationMinutes('');
                    }
                  }}
                />
              )}

              {/* Break Duration (Optional) */}
              <Text style={styles.sectionTitle}>Break Duration (Optional)</Text>
              <View style={styles.breakInputContainer}>
                <Coffee
                  color={COLORS.gray}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.breakInput}
                  placeholder="Break in minutes (e.g., 30)"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                  value={breakDuration}
                  onChangeText={setBreakDuration}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loggingWork && styles.submitButtonDisabled,
                ]}
                onPress={handleLogWork}
                disabled={loggingWork}
              >
                <Text style={styles.submitButtonText}>
                  {loggingWork ? 'Logging...' : 'Log Work Hours'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={styles.selectionScroll}
            >
              {assignedProjects.length === 0 ? (
                <View style={styles.emptyState}>
                  <FolderOpen color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>No assigned projects</Text>
                  <Text style={styles.emptySubtext}>
                    This worker is not assigned to any projects
                  </Text>
                </View>
              ) : (
                assignedProjects.map(project => (
                  <TouchableOpacity
                    key={project.projectId}
                    style={[
                      styles.selectionItem,
                      selectedProject?.projectId === project.projectId &&
                        styles.selectionItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProject(project);
                      setShowProjectModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.projectIconContainer}>
                      <FolderOpen color={COLORS.secondary} size={20} />
                    </View>
                    <View style={styles.selectionInfo}>
                      <Text style={styles.selectionText}>
                        {project.projectName}
                      </Text>
                      {project.description && (
                        <Text style={styles.selectionSubtext}>
                          {project.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProjectModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Duration Modal */}
      <Modal
        visible={showDurationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Duration</Text>
              <TouchableOpacity onPress={() => setShowDurationModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.durationModalInputs}>
              <View style={styles.durationInputContainer}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="HH"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={durationHours}
                  onChangeText={setDurationHours}
                />
                <Text style={styles.durationLabel}>Hours</Text>
              </View>
              <Text style={styles.durationSeparator}>:</Text>
              <View style={styles.durationInputContainer}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="MM"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
                <Text style={styles.durationLabel}>Minutes</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDurationModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  if (durationHours || durationMinutes) {
                    setEndTime(null);
                    setShowDurationModal(false);
                  } else {
                    Alert.alert('Error', 'Please enter duration');
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Selection Modal */}
      <Modal
        visible={showAdminModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.adminModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Reporting Structure</Text>
              <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a manager to assign this worker. Choose from Super Admin,
              management roles, or team leads.
            </Text>

            {/* Scrollable Admin List */}
            <ScrollView
              style={styles.adminScrollView}
              showsVerticalScrollIndicator={true}
            >
              {/* Super Admin Option */}
              <TouchableOpacity
                style={[
                  styles.adminItem,
                  selectedAdminId === null && styles.adminItemSelected,
                ]}
                onPress={() => setSelectedAdminId(null)}
                activeOpacity={0.7}
              >
                <View style={styles.adminItemContent}>
                  <View
                    style={[
                      styles.adminIconContainer,
                      { backgroundColor: COLORS.primary + '15' },
                    ]}
                  >
                    <ShieldCheck color={COLORS.primary} size={20} />
                  </View>
                  <View style={styles.adminInfo}>
                    <Text
                      style={[
                        styles.adminItemText,
                        selectedAdminId === null &&
                          styles.adminItemTextSelected,
                      ]}
                    >
                      Super Admin (Direct)
                    </Text>
                    <Text style={styles.adminItemSubtext}>
                      {superAdminData?.designation ||
                        'Reports directly to Super Admin'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedAdminId === null && styles.radioButtonSelected,
                  ]}
                >
                  {selectedAdminId === null && (
                    <Circle
                      color={COLORS.primary}
                      size={12}
                      fill={COLORS.primary}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Power Level 2 Users */}
              {powerLevel2Users.length > 0 &&
                powerLevel2Users.map(pl2User => (
                  <TouchableOpacity
                    key={pl2User.userId}
                    style={[
                      styles.adminItem,
                      selectedAdminId === pl2User.userId &&
                        styles.adminItemSelected,
                    ]}
                    onPress={() => setSelectedAdminId(pl2User.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adminItemContent}>
                      <View style={styles.adminIconContainer}>
                        <ShieldCheck color={COLORS.primary} size={20} />
                      </View>
                      <View style={styles.adminInfo}>
                        <Text
                          style={[
                            styles.adminItemText,
                            selectedAdminId === pl2User.userId &&
                              styles.adminItemTextSelected,
                          ]}
                        >
                          {pl2User.name}
                        </Text>
                        <View style={styles.badgesContainer}>
                          <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>
                              {pl2User.role}
                            </Text>
                          </View>
                          <View style={styles.designationPill}>
                            <Text style={styles.designationPillText}>
                              {pl2User.designation}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedAdminId === pl2User.userId &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {selectedAdminId === pl2User.userId && (
                        <Circle
                          color={COLORS.primary}
                          size={12}
                          fill={COLORS.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

              {/* Admin List */}
              {(() => {
                // Deduplicate at render time: filter out admins already in Power Level 2
                const pl2UserIds = powerLevel2Users.map(u => u.userId);
                const filteredAdmins = availableAdmins.filter(
                  admin => !pl2UserIds.includes(admin.userId),
                );

                if (
                  filteredAdmins.length === 0 &&
                  powerLevel2Users.length === 0
                ) {
                  return (
                    <View style={styles.emptyAdminState}>
                      <ShieldCheck color={COLORS.gray} size={48} />
                      <Text style={styles.emptyAdminText}>
                        No managers available
                      </Text>
                      <Text style={styles.emptyAdminSubtext}>
                        Create team members with management roles to assign
                        workers
                      </Text>
                    </View>
                  );
                }

                return filteredAdmins.map(admin => (
                  <TouchableOpacity
                    key={admin.userId}
                    style={[
                      styles.adminItem,
                      selectedAdminId === admin.userId &&
                        styles.adminItemSelected,
                    ]}
                    onPress={() => setSelectedAdminId(admin.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adminItemContent}>
                      <View style={styles.adminIconContainer}>
                        <ShieldCheck color={COLORS.primary} size={20} />
                      </View>
                      <View style={styles.adminInfo}>
                        <Text
                          style={[
                            styles.adminItemText,
                            selectedAdminId === admin.userId &&
                              styles.adminItemTextSelected,
                          ]}
                        >
                          {admin.name}
                        </Text>
                        <View style={styles.badgesContainer}>
                          <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>
                              {admin.hierarchyRole}
                            </Text>
                          </View>
                          <View style={styles.designationPill}>
                            <Text style={styles.designationPillText}>
                              {admin.designation}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedAdminId === admin.userId &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {selectedAdminId === admin.userId && (
                        <Circle
                          color={COLORS.primary}
                          size={12}
                          fill={COLORS.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.adminModalActions}>
              <TouchableOpacity
                style={styles.adminModalCancelButton}
                onPress={() => setShowAdminModal(false)}
              >
                <Text style={styles.adminModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.adminModalConfirmButton,
                  reassigningAdmin && styles.adminModalConfirmButtonDisabled,
                ]}
                onPress={handleReassignAdmin}
                disabled={reassigningAdmin}
              >
                <Text style={styles.adminModalConfirmText}>
                  {reassigningAdmin ? 'Assigning...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Worker Groups Modal */}
      <Modal
        visible={showGroupsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Worker Groups</Text>
              <TouchableOpacity onPress={() => setShowGroupsModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listModalScroll}
              showsVerticalScrollIndicator={true}
            >
              {workerGroups.length === 0 ? (
                <View style={styles.emptyModalState}>
                  <Users color={COLORS.gray} size={64} />
                  <Text style={styles.emptyModalText}>No groups assigned</Text>
                  <Text style={styles.emptyModalSubtext}>
                    This worker is not part of any worker group yet
                  </Text>
                </View>
              ) : (
                workerGroups.map(group => (
                  <View key={group.groupId} style={styles.listModalItem}>
                    <View style={styles.listModalIconContainer}>
                      <Users color={COLORS.primary} size={20} />
                    </View>
                    <View style={styles.listModalInfo}>
                      <Text style={styles.listModalItemTitle}>
                        {group.name}
                      </Text>
                      <Text style={styles.listModalItemSubtitle}>
                        {group.description || 'No description'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assigned Projects Modal */}
      <Modal
        visible={showProjectsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assigned Projects</Text>
              <TouchableOpacity onPress={() => setShowProjectsModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listModalScroll}
              showsVerticalScrollIndicator={true}
            >
              {assignedProjects.length === 0 ? (
                <View style={styles.emptyModalState}>
                  <FolderOpen color={COLORS.gray} size={64} />
                  <Text style={styles.emptyModalText}>
                    No projects assigned
                  </Text>
                  <Text style={styles.emptyModalSubtext}>
                    This worker is not assigned to any projects yet
                  </Text>
                </View>
              ) : (
                assignedProjects.map(project => (
                  <View key={project.projectId} style={styles.listModalItem}>
                    <View
                      style={[
                        styles.listModalIconContainer,
                        { backgroundColor: COLORS.secondary + '15' },
                      ]}
                    >
                      <FolderOpen color={COLORS.secondary} size={20} />
                    </View>
                    <View style={styles.listModalInfo}>
                      <Text style={styles.listModalItemTitle}>
                        {project.name}
                      </Text>
                      <Text style={styles.listModalItemSubtitle}>
                        {project.description || 'No description'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employees List Modal */}
      <Modal
        visible={showEmployeesListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeesListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Employees under {user.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEmployeesListModal(false)}
              >
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listModalScroll}
              showsVerticalScrollIndicator={true}
            >
              {workers.length === 0 ? (
                <View style={styles.emptyModalState}>
                  <Users color={COLORS.gray} size={64} />
                  <Text style={styles.emptyModalText}>
                    No Employees assigned
                  </Text>
                  <Text style={styles.emptyModalSubtext}>
                    Employees will appear here when assigned to {user.name}
                  </Text>
                </View>
              ) : (
                workers.map(worker => (
                  <TouchableOpacity
                    key={worker.userId}
                    style={styles.listModalItem}
                    onPress={() => {
                      setShowEmployeesListModal(false);
                      navigation.navigate('UserDetail', {
                        userId: worker.userId,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listModalIconContainer}>
                      <User color={COLORS.secondary} size={20} />
                    </View>
                    <View style={styles.listModalInfo}>
                      <Text style={styles.listModalItemTitle}>
                        {worker.name}
                      </Text>
                      <Text style={styles.listModalItemSubtitle}>
                        @{worker.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarAdmin: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '30',
  },
  avatarWorker: {
    backgroundColor: COLORS.secondary + '15',
    borderColor: COLORS.secondary + '30',
  },
  profileInfoSection: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadgeNew: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminBadgeNew: {
    backgroundColor: COLORS.primary + '15',
  },
  workerBadgeNew: {
    backgroundColor: COLORS.secondary + '15',
  },
  roleBadgeTextNew: {
    fontSize: 13,
    fontWeight: '600',
  },
  adminBadgeTextNew: {
    color: COLORS.primary,
  },
  workerBadgeTextNew: {
    color: COLORS.secondary,
  },
  designationBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  designationTextNew: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: -20,
    marginBottom: -20,
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  accordionToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: COLORS.primary + '15',
  },
  workerBadge: {
    backgroundColor: COLORS.secondary + '15',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminBadgeText: {
    color: COLORS.primary,
  },
  workerBadgeText: {
    color: COLORS.secondary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  groupDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  projectIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  projectDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  logWorkButtonTop: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logWorkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logWorkIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logWorkTextWrapper: {
    flex: 1,
  },
  logWorkButtonTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  logWorkButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  listModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  listModalScroll: {
    maxHeight: 400,
  },
  listModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listModalInfo: {
    flex: 1,
  },
  listModalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  listModalItemSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  emptyModalState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyModalSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  workersCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  workerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  workerUsername: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  adminAssignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  directReportText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 16,
  },
  durationInputContainer: {
    alignItems: 'center',
  },
  durationInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    width: 80,
  },
  durationLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  durationSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 8,
  },
  breakInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  breakInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 'auto',
    gap: 4,
  },
  changeBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  adminModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '75%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  adminScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  adminItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  adminItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminInfo: {
    flex: 1,
  },
  adminItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  adminItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  adminItemSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyAdminState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyAdminText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptyAdminSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  adminModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  adminModalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  adminModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  adminModalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  adminModalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  adminModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.gray,
    marginLeft: 12,
    fontWeight: '500',
  },
  selectButtonTextSelected: {
    color: COLORS.text,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateTimeColumn: {
    flex: 1,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smallButtonText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  endDateRow: {
    marginTop: 8,
  },
  endDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  endDateText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  changeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  orButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 8,
  },
  orButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  orButtonDisabled: {
    opacity: 0.4,
    backgroundColor: COLORS.lightGray,
  },
  orButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  orButtonTextSelected: {
    color: COLORS.white,
  },
  orButtonTextDisabled: {
    color: COLORS.gray,
  },
  orText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  selectionModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  selectionScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  selectionItemSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary + '05',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectionSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timePickerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  durationModalInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  rolePill: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  designationPill: {
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  designationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
});

export default UserDetailScreen;
