import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Briefcase, Plus, X, ChevronRight, Users, Calendar } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getProjectsByOrg } from '../services/storageService';

const ProjectListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectData = await getProjectsByOrg(session.orgId);
      setProjects(projectData);
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

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
        ) : (
          projects.map((project) => (
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
