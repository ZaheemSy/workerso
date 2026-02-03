import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Heart,
  Coffee,
  Star,
  Sparkles,
  Gift,
  Crown,
  Zap,
  ArrowLeft,
} from 'lucide-react-native';
import LottieView from 'lottie-react-native';

const SupportDevScreen = ({ navigation }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);

  // Tip amounts with their product IDs (for future Google Play Billing integration)
  const tipOptions = [
    {
      id: 'tip_10',
      amount: 10,
      label: 'Coffee',
      icon: Coffee,
      color: '#8B4513',
      bgColor: '#FFF3E0',
      description: 'Buy me a coffee ☕',
    },
    {
      id: 'tip_20',
      amount: 20,
      label: 'Small Tip',
      icon: Heart,
      color: '#EC4899',
      bgColor: '#FDF2F8',
      description: 'A kind gesture 💝',
    },
    {
      id: 'tip_30',
      amount: 30,
      label: 'Nice Tip',
      icon: Star,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      description: 'Appreciate the work ⭐',
    },
    {
      id: 'tip_40',
      amount: 40,
      label: 'Good Tip',
      icon: Sparkles,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      description: 'Great support ✨',
    },
    {
      id: 'tip_50',
      amount: 50,
      label: 'Generous',
      icon: Gift,
      color: '#10B981',
      bgColor: '#ECFDF5',
      description: 'Very generous 🎁',
    },
    {
      id: 'tip_100',
      amount: 100,
      label: 'Awesome',
      icon: Zap,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      description: 'Awesome support ⚡',
    },
    {
      id: 'tip_200',
      amount: 200,
      label: 'Super',
      icon: Crown,
      color: '#F97316',
      bgColor: '#FFF7ED',
      description: 'Super generous 👑',
    },
    {
      id: 'tip_250',
      amount: 250,
      label: 'Amazing',
      icon: Star,
      color: '#14B8A6',
      bgColor: '#F0FDFA',
      description: 'Amazing support 🌟',
    },
    {
      id: 'tip_500',
      amount: 500,
      label: 'Incredible',
      icon: Sparkles,
      color: '#6366F1',
      bgColor: '#EEF2FF',
      description: 'Incredible! 💎',
    },
    {
      id: 'tip_750',
      amount: 750,
      label: 'Outstanding',
      icon: Crown,
      color: '#A855F7',
      bgColor: '#FAF5FF',
      description: 'Outstanding! 🏆',
    },
    {
      id: 'tip_1000',
      amount: 1000,
      label: 'Legendary',
      icon: Crown,
      color: '#DC2626',
      bgColor: '#FEF2F2',
      description: 'Legendary support! 🎖️',
    },
    {
      id: 'tip_2000',
      amount: 2000,
      label: 'Epic',
      icon: Zap,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      description: 'Epic generosity! 🔥',
    },
  ];

  // This function will handle the billing flow once Google Play Billing is integrated
  const handleTipSelection = tip => {
    setSelectedAmount(tip.amount);

    // TODO: Phase 1 - Implement Google Play Billing
    // launchBillingFlow(tip.id);

    // Temporary alert for demonstration
    Alert.alert(
      '💝 Thank You!',
      `You selected ₹${tip.amount} tip.\n\n${tip.description}\n\nGoogle Play Billing will be integrated in Phase 1.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            // This will be replaced with actual billing flow
            Alert.alert(
              '🎉 Success',
              'Thank you for your generous support! This will process through Google Play once integrated.',
              [{ text: 'OK', onPress: () => setSelectedAmount(null) }],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Developer</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.lottieContainer}>
            <LottieView
              source={require('../assets/json/Thanks_alot.json')}
              autoPlay
              loop
              speed={0.3}
              style={styles.heroLottie}
            />
          </View>
          <Text style={styles.heroTitle}>
            Support{' '}
            <Text style={[styles.heroTitle, { color: '#2852adff' }]}>
              Workerso App
            </Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Your support helps keep this app free and actively developed. Every
            contribution is deeply appreciated! 💙
          </Text>
        </View>

        {/* Developer Introduction */}
        <View style={styles.developerCard}>
          <Text style={styles.developerIntro}>
            Hi, I am Zaheem, the developer of this app. 👋
          </Text>
          <Text style={styles.developerMessage}>
            I built Workerso to help businesses manage their workforce
            efficiently. This app is completely free to use, with no hidden fees
            or subscriptions. I'm passionate about creating tools that make a
            real difference in people's work lives.
            {'\n\n'}
            Your support means the world to me! It helps cover development
            costs, allows me to add new features, and keeps me motivated to make
            Workerso even better. Whether it's a coffee or a generous tip, every
            contribution is deeply appreciated and goes directly into improving
            this app for you. 💙
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Heart color="#EC4899" size={24} fill="#EC4899" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>100% Optional</Text>
            <Text style={styles.infoText}>
              This app is completely free. Tips are optional and help support
              future development.
            </Text>
          </View>
        </View>

        {/* Tip Options Title */}
        <Text style={styles.sectionTitle}>Choose Your Support Amount</Text>
        <Text style={styles.sectionSubtitle}>
          Temporarily Disabled for now{' '}
        </Text>

        {/* Tip Options Grid */}
        <View style={styles.tipGrid}>
          {tipOptions.map(tip => {
            const IconComponent = tip.icon;
            const isSelected = selectedAmount === tip.amount;

            return (
              <TouchableOpacity
                key={tip.id}
                style={[
                  styles.tipCard,
                  isSelected && styles.tipCardSelected,
                  { borderColor: tip.color },
                ]}
                onPress={() => handleTipSelection(tip)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.tipIconBox, { backgroundColor: tip.bgColor }]}
                >
                  <IconComponent color={tip.color} size={24} />
                </View>
                <Text style={styles.tipAmount}>₹{tip.amount}</Text>
                <Text style={styles.tipLabel}>{tip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What Your Support Helps With</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureBullet}>
              <Zap color="#F59E0B" size={16} />
            </View>
            <Text style={styles.featureText}>
              Regular updates and new features
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureBullet}>
              <Star color="#F59E0B" size={16} />
            </View>
            <Text style={styles.featureText}>
              Bug fixes and performance improvements
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureBullet}>
              <Heart color="#F59E0B" size={16} fill="#F59E0B" />
            </View>
            <Text style={styles.featureText}>
              Keeping the app free for everyone
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureBullet}>
              <Sparkles color="#F59E0B" size={16} />
            </View>
            <Text style={styles.featureText}>
              Developer motivation and coffee ☕
            </Text>
          </View>
        </View>

        {/* Technical Note for Developer */}
        <View style={styles.devNote}>
          <Text style={styles.devNoteTitle}>🔧 Developer Note</Text>
          <Text style={styles.devNoteText}>
            More updates to come:{'\n'}• Communication between Super Admin and
            Admins{'\n'}• And between Super Admin and Employees{'\n'}•
            Communication between Admin and Employees{'\n'}• And more!
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lottieContainer: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  heroLottie: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 2 }],
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  developerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  developerIntro: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  developerMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#BE185D',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#9F1239',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  tipCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  tipCardSelected: {
    borderWidth: 3,
    transform: [{ scale: 0.98 }],
  },
  tipIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tipAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  devNote: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  devNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 8,
  },
  devNoteText: {
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SupportDevScreen;
