import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Search,
  Briefcase,
  ChevronRight,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/roles';
import { getProjectsByOrg } from '../services/storageService';

const ProjectSelectionScreen = ({ navigation, route }) => {
  const { reportType } = route.params; // 'worklogs-project' or 'attendance-project'
  const { session } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      let projectList = await getProjectsByOrg(session.orgId);

      // Role-based filtering
      if (session.role === ROLES.SUPER_ADMIN) {
        // Power 1 - Super Admin sees all projects
        // No filtering needed
      } else if (session.role === ROLES.ADMIN) {
        // Power 2 - Admin sees projects they manage or are assigned to
        projectList = projectList.filter(project => {
          // Check if admin is the project manager
          if (project.managerId === session.userId) {
            return true;
          }
          // Check if admin is assigned to the project
          if (project.admins && project.admins.includes(session.userId)) {
            return true;
          }
          return false;
        });
      }

      setProjects(projectList);
      setFilteredProjects(projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = projects.filter(
      project =>
        project.projectName?.toLowerCase().includes(query) ||
        project.location?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
    setFilteredProjects(filtered);
  };

  const handleProjectSelect = (project) => {
    // Navigate to report options screen
    navigation.navigate('ReportOptions', {
      reportType,
      project,
    });
  };

  const getReportTitle = () => {
    if (reportType === 'worklogs-project') {
      return 'Work Logs by Project';
    } else if (reportType === 'attendance-project') {
      return 'Attendance by Project';
    }
    return 'Select Project';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#6B7280';
      case 'on-hold':
        return '#F59E0B';
      default:
        return COLORS.primary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getReportTitle()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Briefcase color={COLORS.primary} size={20} />
          <Text style={styles.infoText}>
            Select a project to view {reportType === 'worklogs-project' ? 'work logs' : 'attendance records'}
          </Text>
        </View>

        {/* Project List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Briefcase color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No projects found' : 'No projects available'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.projectList}
            showsVerticalScrollIndicator={false}
          >
            {filteredProjects.map((project) => (
              <TouchableOpacity
                key={project.projectId}
                style={styles.projectCard}
                onPress={() => handleProjectSelect(project)}
                activeOpacity={0.7}
              >
                <View style={styles.projectHeader}>
                  <View style={styles.projectLeft}>
                    <View
                      style={[
                        styles.projectIconCircle,
                        { backgroundColor: getStatusColor(project.status) + '20' },
                      ]}
                    >
                      <Briefcase color={getStatusColor(project.status)} size={20} />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>{project.projectName}</Text>
                      {project.location && (
                        <View style={styles.projectDetail}>
                          <MapPin color={COLORS.textLight} size={12} />
                          <Text style={styles.projectDetailText}>{project.location}</Text>
                        </View>
                      )}
                      {project.startDate && (
                        <View style={styles.projectDetail}>
                          <Calendar color={COLORS.textLight} size={12} />
                          <Text style={styles.projectDetailText}>
                            {formatDate(project.startDate)}
                            {project.endDate && ` - ${formatDate(project.endDate)}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight color={COLORS.gray} size={20} />
                </View>
                {project.status && (
                  <View style={styles.projectFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(project.status) + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(project.status) },
                        ]}
                      >
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: COLORS.textLight,
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
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  projectList: {
    flex: 1,
  },
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  projectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  projectDetailText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default ProjectSelectionScreen;
