import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { formatDateToDDMMYYYY, formatDateToISO } from '../utils/dateUtils';

/**
 * DatePickerInput Component
 * A reusable date picker that displays dates in dd/mm/yyyy format
 *
 * @param {Object} props
 * @param {Date|string|null} props.value - Current date value
 * @param {Function} props.onChange - Callback when date changes (receives Date object)
 * @param {string} props.placeholder - Placeholder text
 * @param {Date} props.minimumDate - Minimum selectable date
 * @param {Date} props.maximumDate - Maximum selectable date
 * @param {boolean} props.disabled - Whether the picker is disabled
 */
const DatePickerInput = ({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    value ? (typeof value === 'string' ? new Date(value) : value) : new Date()
  );

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      onChange(date);
    }

    if (event.type === 'dismissed') {
      // User cancelled
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
    }
  };

  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const handleDone = () => {
    setShowPicker(false);
  };

  const displayValue = value
    ? formatDateToDDMMYYYY(value)
    : placeholder;

  const hasValue = !!value;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Calendar
          color={hasValue ? COLORS.primary : COLORS.gray}
          size={20}
          style={styles.icon}
        />
        <Text
          style={[
            styles.text,
            !hasValue && styles.placeholderText,
            disabled && styles.disabledText,
          ]}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            textColor={COLORS.text}
          />

          {Platform.OS === 'ios' && (
            <View style={styles.iosButtonContainer}>
              <TouchableOpacity
                style={styles.iosButton}
                onPress={handleDone}
              >
                <Text style={styles.iosButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerDisabled: {
    backgroundColor: COLORS.extraLightGray,
    opacity: 0.6,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  disabledText: {
    color: COLORS.gray,
  },
  iosButtonContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iosButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  iosButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DatePickerInput;
