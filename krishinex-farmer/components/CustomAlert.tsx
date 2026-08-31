import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Platform,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export const customAlertRef = React.createRef<any>();

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function showAlert(
  title: string, 
  message: string, 
  buttons: AlertButton[] = [{ text: 'OK', style: 'default' }]
) {
  if (customAlertRef.current) {
    customAlertRef.current.show(title, message, buttons);
  } else {
    // Fallback if component is not mounted
    Alert.alert(title, message, buttons as any);
  }
}

export const CustomAlert = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show: (t: string, m: string, b: AlertButton[]) => {
      setTitle(t);
      setMessage(m);
      setButtons(b);
      setVisible(true);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }));

  const hide = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  if (!visible) return null;

  // Determine icon based on title
  const tLower = title.toLowerCase();
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';
  let iconColor = '#7CB342'; // Khetify Primary Green
  
  if (tLower.includes('error') || tLower.includes('त्रुटि') || tLower.includes('fail') || tLower.includes('विफल')) {
    iconName = 'alert-circle';
    iconColor = '#EF4444'; // Red
  } else if (tLower.includes('success') || tLower.includes('सफल')) {
    iconName = 'checkmark-circle';
    iconColor = '#10B981'; // Green
  } else if (tLower.includes('warning') || tLower.includes('अलर्ट')) {
    iconName = 'warning';
    iconColor = '#F59E0B'; // Yellow
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => hide()}>
      <TouchableWithoutFeedback onPress={() => hide()}>
        <View style={styles.overlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
          
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.alertBox, 
                { 
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim 
                }
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={iconName} size={48} color={iconColor} />
              </View>
              
              <Text style={styles.title}>{title}</Text>
              {!!message && <Text style={styles.message}>{message}</Text>}
              
              <View style={styles.buttonContainer}>
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isCancel ? styles.buttonCancel : 
                        isDestructive ? styles.buttonDestructive : styles.buttonDefault,
                        buttons.length > 1 && { flex: 1, marginHorizontal: 4 }
                      ]}
                      onPress={() => hide(btn.onPress)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.buttonText,
                        isCancel ? styles.buttonTextCancel : 
                        isDestructive ? styles.buttonTextDestructive : styles.buttonTextDefault
                      ]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDefault: {
    backgroundColor: '#7CB342', // Khetify green
  },
  buttonCancel: {
    backgroundColor: '#F3F4F6',
  },
  buttonDestructive: {
    backgroundColor: '#FEE2E2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDefault: {
    color: '#ffffff',
  },
  buttonTextCancel: {
    color: '#374151',
  },
  buttonTextDestructive: {
    color: '#EF4444',
  },
});
