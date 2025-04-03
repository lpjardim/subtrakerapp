import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, ArrowUpDown, CreditCard, Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { format, addDays, addMonths, addYears } from 'date-fns';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  paymentMethod: string;
  isAnnual: boolean;
  paymentDay: number;
  nextPayment: Date;
  createdAt: Date;
}

type SortOption = 'date-newest' | 'date-oldest' | 'amount-highest' | 'amount-lowest';

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-newest');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isAnnual, setIsAnnual] = useState(false);
  const [paymentDay, setPaymentDay] = useState('1');

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const amount = sub.isAnnual ? sub.amount / 12 : sub.amount;
    return sum + amount;
  }, 0);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'web') return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  };

  const schedulePaymentNotification = async (subscription: Subscription) => {
    if (Platform.OS === 'web') return;

    const trigger = addDays(subscription.nextPayment, -3);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Subscription Payment',
        body: `${subscription.name} payment of $${subscription.amount} is due in 3 days`,
      },
      trigger: trigger,
    });
  };

  const calculateNextPayment = (day: number, isAnnual: boolean) => {
    const today = new Date();
    const currentDay = today.getDate();
    let nextPayment = new Date(today.getFullYear(), today.getMonth(), day);
    
    if (currentDay >= day) {
      nextPayment = isAnnual 
        ? addYears(nextPayment, 1)
        : addMonths(nextPayment, 1);
    }
    
    return nextPayment;
  };

  const addSubscription = () => {
    if (newName && newAmount && paymentMethod && paymentDay) {
      const amount = parseFloat(newAmount);
      const day = Math.min(Math.max(parseInt(paymentDay, 10), 1), 31);
      
      if (!isNaN(amount) && !isNaN(day)) {
        const newSubscription: Subscription = {
          id: Date.now().toString(),
          name: newName,
          amount,
          paymentMethod,
          isAnnual,
          paymentDay: day,
          nextPayment: calculateNextPayment(day, isAnnual),
          createdAt: new Date(),
        };

        setSubscriptions([...subscriptions, newSubscription]);
        schedulePaymentNotification(newSubscription);
        setNewName('');
        setNewAmount('');
        setPaymentMethod('');
        setIsAnnual(false);
        setPaymentDay('1');
        setShowAddForm(false);
      }
    }
  };

  const removeSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter(sub => sub.id !== id));
  };

  const sortSubscriptions = (subs: Subscription[]): Subscription[] => {
    switch (sortOption) {
      case 'date-newest':
        return [...subs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'date-oldest':
        return [...subs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case 'amount-highest':
        return [...subs].sort((a, b) => b.amount - a.amount);
      case 'amount-lowest':
        return [...subs].sort((a, b) => a.amount - b.amount);
      default:
        return subs;
    }
  };

  const sortedSubscriptions = sortSubscriptions(subscriptions);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscriptions</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}>
            <ArrowUpDown size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Monthly Total</Text>
          <Text style={styles.totalAmount}>
            ${totalMonthly.toFixed(2)}
          </Text>
        </View>

        {sortedSubscriptions.map(subscription => (
          <View key={subscription.id} style={styles.subscriptionItem}>
            <View>
              <Text style={styles.subscriptionName}>{subscription.name}</Text>
              <Text style={styles.subscriptionAmount}>
                ${subscription.amount.toFixed(2)}/{subscription.isAnnual ? 'year' : 'month'}
              </Text>
              <View style={styles.subscriptionDetails}>
                <CreditCard size={14} color="#666666" />
                <Text style={styles.detailText}>{subscription.paymentMethod}</Text>
                <Bell size={14} color="#666666" style={styles.detailIcon} />
                <Text style={styles.detailText}>
                  Next: {format(subscription.nextPayment, 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => removeSubscription(subscription.id)}
              style={styles.removeButton}>
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>
        ))}

        {showAddForm ? (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Subscription name"
              placeholderTextColor="#666666"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#666666"
              keyboardType="decimal-pad"
              value={newAmount}
              onChangeText={setNewAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Payment method (e.g., Bank transfer, MBWay)"
              placeholderTextColor="#666666"
              value={paymentMethod}
              onChangeText={setPaymentMethod}
            />
            <TextInput
              style={styles.input}
              placeholder="Payment day (1-31)"
              placeholderTextColor="#666666"
              keyboardType="number-pad"
              value={paymentDay}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (!isNaN(num) && num >= 1 && num <= 31) {
                  setPaymentDay(text);
                }
              }}
            />
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Annual billing</Text>
              <Switch
                value={isAnnual}
                onValueChange={setIsAnnual}
                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                thumbColor={isAnnual ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addSubscription}>
              <Text style={styles.addButtonText}>Add Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addSubscriptionButton}
            onPress={() => setShowAddForm(true)}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort Subscriptions</Text>
            {[
              { value: 'date-newest', label: 'Newest First' },
              { value: 'date-oldest', label: 'Oldest First' },
              { value: 'amount-highest', label: 'Highest Amount' },
              { value: 'amount-lowest', label: 'Lowest Amount' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sortOption === option.value && styles.sortOptionSelected,
                ]}
                onPress={() => {
                  setSortOption(option.value as SortOption);
                  setShowSortModal(false);
                }}>
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOption === option.value && styles.sortOptionTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subscriptionAmount: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 8,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  detailIcon: {
    marginLeft: 12,
  },
  removeButton: {
    padding: 8,
  },
  addSubscriptionButton: {
    backgroundColor: '#1C1C1E',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  addForm: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: '#FFFFFF',
    fontSize: 16,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sortOptionSelected: {
    backgroundColor: '#2C2C2E',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  sortOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});