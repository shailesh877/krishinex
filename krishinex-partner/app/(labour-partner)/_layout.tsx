import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import { useLabourBadge } from '../../hooks/useLabourBadge';

export default function LabourPartnerLayout() {
  const { isHindi } = useI18n();
  const { newCount } = useLabourBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: isHindi ? 'होम' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: isHindi ? 'जॉब्स' : 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="briefcase-outline" size={size} color={color} />
              {newCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 16,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  elevation: 5,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                    {newCount > 99 ? '99+' : newCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: isHindi ? 'वॉलेट' : 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isHindi ? 'प्रोफाइल' : 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Screens that should not appear in the tab bar */}
      <Tabs.Screen name="booking-detail" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="notifications" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="help" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="terms" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
