import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Briefcase, Plus, X, ChevronRight, Users, Calendar, Search } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/roles';
import { getProjectsByOrg } from '../services/storageService';

const ProjectListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      let projectData = await getProjectsByOrg(session.orgId);

      // Role-based filtering
      if (session.role === ROLES.ADMIN) {
        // Power 2 - Admin sees only projects they manage or are assigned to
        projectData = projectData.filter(project => {
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
      // Super Admin (Power 1) sees all projects - no filtering needed

      setProjects(projectData);
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    const name = project.projectName?.toLowerCase() || '';
    const description = project.description?.toLowerCase() || '';
    return name.includes(query) || description.includes(query);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projects</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateProject', { onProjectCreated: loadProjects })}
          style={styles.headerButton}
        >
          <Plus color={COLORS.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name or description..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={COLORS.gray} size={20} />
            </TouchableOpacity>
          )}
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Projects</Text>
            <Text style={styles.emptyText}>Create your first project to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateProject', { onProjectCreated: loadProjects })}
            >
              <Plus color={COLORS.white} size={20} style={styles.buttonIcon} />
              <Text style={styles.emptyButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Search color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try searching with different keywords</Text>
          </View>
        ) : (
          filteredProjects.map((project) => (
            <TouchableOpacity
              key={project.projectId}
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: project.projectId, onProjectUpdated: loadProjects })}
              activeOpacity={0.7}
            >
              <View style={styles.projectIcon}>
                <Briefcase color={COLORS.primary} size={24} />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.projectName}</Text>
                {project.description && (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                )}
                <View style={styles.projectMeta}>
                  <View style={styles.metaItem}>
                    <Users color={COLORS.textLight} size={14} />
                    <Text style={styles.metaText}>
                      {project.workers?.length || 0} workers
                    </Text>
                  </View>
                  {project.startDate && (
                    <View style={styles.metaItem}>
                      <Calendar color={COLORS.textLight} size={14} />
                      <Text style={styles.metaText}>
                        {new Date(project.startDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight color={COLORS.gray} size={20} />
            </TouchableOpacity>
          ))
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  projectDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectListScreen;
