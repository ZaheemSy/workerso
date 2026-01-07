# DatePicker Setup Guide

## Installation

The app now uses a native date picker component that requires installing the `@react-native-community/datetimepicker` package.

### Step 1: Install the Package

```bash
npm install @react-native-community/datetimepicker
```

### Step 2: iOS Setup

For iOS, install the pods:

```bash
cd ios
pod install
cd ..
```

### Step 3: Android Setup

No additional setup needed for Android - it works automatically after npm install.

### Step 4: Test the Installation

1. **Start the app:**
   ```bash
   npm run ios
   # or
   npm run android
   ```

2. **Test the date picker:**
   - Go to any screen with date input (e.g., Create Project)
   - Tap on the date input field
   - A native calendar picker should appear
   - Select a date
   - Date should display in dd/mm/yyyy format

## Usage

The app now has a reusable `DatePickerInput` component located at:
`src/components/DatePickerInput.js`

### Example Usage:

```javascript
import DatePickerInput from '../components/DatePickerInput';

function MyScreen() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  return (
    <>
      <DatePickerInput
        value={startDate}
        onChange={(date) => setStartDate(date)}
        placeholder="Start Date"
      />

      <DatePickerInput
        value={endDate}
        onChange={(date) => setEndDate(date)}
        placeholder="End Date"
        minimumDate={startDate || undefined}
      />
    </>
  );
}
```

## Features Implemented

### 1. Date Formatting Utilities (`src/utils/dateUtils.js`)

- **`formatDateToDDMMYYYY(date)`** - Formats date to dd/mm/yyyy
- **`parseDDMMYYYY(string)`** - Parses dd/mm/yyyy string to Date
- **`formatDateToISO(date)`** - Formats date to YYYY-MM-DD for storage
- **`getToday()`** - Returns today's date at midnight
- **`isToday(date)`** - Checks if date is today
- **`getRelativeDateString(date)`** - Returns "Today", "Yesterday", etc.
- **`daysBetween(date1, date2)`** - Calculates days between dates

### 2. DatePickerInput Component

Props:
- `value` - Current date value (Date object or null)
- `onChange` - Callback when date changes
- `placeholder` - Placeholder text
- `minimumDate` - Minimum selectable date
- `maximumDate` - Maximum selectable date
- `disabled` - Disable the picker

Features:
- Native calendar picker for both iOS and Android
- Displays dates in dd/mm/yyyy format
- Platform-specific UI (spinner on iOS, calendar on Android)
- Touch-friendly interface
- Validates date ranges

### 3. Enhanced Create Project Screen

New features added:
- **Start Date Picker** - Select project start date
- **End Date Picker** - Select project end date (must be after start date)
- **Worker Selection** - Add individual workers to project
- **Group Selection** - Add entire worker groups to project
- **Combined Selection** - Workers from groups are automatically included
- **Optional Assignment** - Can skip and add workers later

## Where DatePicker is Used

Currently integrated in:
- ✅ **Create Project Screen** - Start date and end date

Can be easily added to:
- Attendance Records filtering
- Work Logs filtering
- Reports date range selection
- Worker profile (date of joining)
- Any other date input needs

## Troubleshooting

### iOS Issues

**Error: "RNDateTimePicker" not found**

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**Build fails after pod install:**

1. Clean build folder in Xcode: Product → Clean Build Folder
2. Rebuild the app

### Android Issues

**Error: "Unable to resolve module @react-native-community/datetimepicker"**

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
cd android
./gradlew clean
cd ..
```

**Date picker not showing:**

1. Make sure you're using React Native 0.60 or higher
2. Verify package is installed: `npm list @react-native-community/datetimepicker`

### General Issues

**Date displays as "Invalid Date":**

- Check that you're passing a valid Date object
- Use `formatDateToISO()` when storing dates
- Use `parseDDMMYYYY()` when reading dd/mm/yyyy strings

**Date picker doesn't open:**

- Check that the component is properly imported
- Verify no errors in console
- Make sure `DateTimePicker` is installed correctly

## Date Format Standards

Throughout the app:

### Display Format
- **User-facing:** dd/mm/yyyy (e.g., 25/12/2024)
- Use `formatDateToDDMMYYYY()` for display

### Storage Format
- **Database:** YYYY-MM-DD (ISO format)
- Use `formatDateToISO()` for storage
- This is compatible with Firebase Firestore

### Internal Format
- **JavaScript:** Date objects
- Pass Date objects between components
- Convert to string only for storage/display

## Examples

### Create Project with Dates

```javascript
const project = await createProject({
  orgId: session.orgId,
  projectName: 'New Project',
  startDate: formatDateToISO(startDate),  // '2024-01-15'
  endDate: formatDateToISO(endDate),      // '2024-06-30'
  workers: selectedWorkers,
  groups: selectedGroups,
});
```

### Display Project Dates

```javascript
<Text>Start: {formatDateToDDMMYYYY(project.startDate)}</Text>
// Output: "Start: 15/01/2024"

<Text>End: {formatDateToDDMMYYYY(project.endDate)}</Text>
// Output: "End: 30/06/2024"
```

### Calculate Project Duration

```javascript
const duration = daysBetween(
  new Date(project.startDate),
  new Date(project.endDate)
);
console.log(`Project duration: ${duration} days`);
```

## Next Steps

After installation:

1. Test date picker on both iOS and Android
2. Add date pickers to other screens as needed
3. Consider adding date range presets (This Week, This Month, etc.)
4. Add date validation rules for your business logic

## Reference

- [React Native DateTimePicker Docs](https://github.com/react-native-datetimepicker/datetimepicker)
- [Date object reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

---

Happy coding! 🗓️
