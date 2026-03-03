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
  Users,
  ChevronRight,
  Briefcase,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/roles';
import {
  getUsersByOrg,
  getUsersByAdmin,
  getDesignationById,
} from '../services/storageService';

const EmployeeSelectionScreen = ({ navigation, route }) => {
  const { reportType } = route.params; // 'worklogs-employee' or 'attendance-employee'
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [designations, setDesignations] = useState({});

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      let employeeList = [];

      // Role-based filtering: Power 1 sees all, Power 2 sees only their team
      if (session.role === ROLES.SUPER_ADMIN) {
        // Power 1 - Super Admin sees all employees
        employeeList = await getUsersByOrg(session.orgId);
      } else if (session.role === ROLES.ADMIN) {
        // Power 2 - Admin sees only their team members
        employeeList = await getUsersByAdmin(session.userId);
      }

      // Load designations for each employee
      const designationData = {};
      for (const emp of employeeList) {
        if (emp.designationId) {
          const designation = await getDesignationById(emp.designationId);
          if (designation) {
            designationData[emp.designationId] = designation.title;
          }
        }
      }
      setDesignations(designationData);

      setEmployees(employeeList);
      setFilteredEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      employee =>
        employee.name?.toLowerCase().includes(query) ||
        employee.username?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
  };

  const handleEmployeeSelect = (employee) => {
    if (reportType === 'worklogs-employee') {
      navigation.navigate('ReportPreview', {
        reportType,
        reportOption: 'combined',
        employee,
      });
      return;
    }

    // Keep current flow for attendance reports
    navigation.navigate('ReportOptions', {
      reportType,
      employee,
    });
  };

  const getReportTitle = () => {
    if (reportType === 'worklogs-employee') {
      return 'Work Logs by Employee';
    } else if (reportType === 'attendance-employee') {
      return 'Attendance by Employee';
    }
    return 'Select Employee';
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
            placeholder="Search employees..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Users color={COLORS.primary} size={20} />
          <Text style={styles.infoText}>
            Select an employee to view their {reportType === 'worklogs-employee' ? 'work logs' : 'attendance records'}
          </Text>
        </View>

        {/* Employee List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No employees found' : 'No employees available'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.employeeList}
            showsVerticalScrollIndicator={false}
          >
            {filteredEmployees.map((employee) => (
              <TouchableOpacity
                key={employee.userId}
                style={styles.employeeCard}
                onPress={() => handleEmployeeSelect(employee)}
                activeOpacity={0.7}
              >
                <View style={styles.employeeLeft}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    {employee.designationId && designations[employee.designationId] && (
                      <View style={styles.designationBadge}>
                        <Briefcase color={COLORS.primary} size={12} />
                        <Text style={styles.designationText}>
                          {designations[employee.designationId]}
                        </Text>
                      </View>
                    )}
                    {employee.email && (
                      <Text style={styles.employeeEmail}>{employee.email}</Text>
                    )}
                  </View>
                </View>
                <ChevronRight color={COLORS.gray} size={20} />
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
  employeeList: {
    flex: 1,
  },
  employeeCard: {
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
  employeeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  designationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  designationText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  employeeEmail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});

export default EmployeeSelectionScreen;
