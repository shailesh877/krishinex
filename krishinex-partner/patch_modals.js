const fs = require('fs');
const path = require('path');

const files = [
  'app/(buyer)/notifications.tsx',
  'app/(employee)/notifications.tsx',
  'app/(labour-partner)/notifications.tsx',
  'app/(shop-partner)/notifications.tsx',
  'app/(soil-lab)/notifications.tsx'
];

files.forEach(file => {
  let p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf8');

  let modified = false;

  // Add Modal import
  if (!content.includes('Modal,')) {
    content = content.replace('Linking,\n}', 'Linking,\n    Modal,\n}');
    modified = true;
  }

  // Add selectedNotif state and handleNotificationPress
  const stateStr = `    const unreadCount = items.filter(n => n.unread).length;

    const [selectedNotif, setSelectedNotif] = useState<NotifItem | null>(null);

    const handleNotificationPress = (item: NotifItem) => {
        if (item.unread) markRead(item._id);
        setSelectedNotif(item);
    };`;
    
  if (!content.includes('handleNotificationPress')) {
    content = content.replace('    const unreadCount = items.filter(n => n.unread).length;', stateStr);
    modified = true;
  }

  // Replace onPress
  if (content.includes('onPress={() => markRead(item._id)}')) {
    content = content.replace('onPress={() => markRead(item._id)}', 'onPress={() => handleNotificationPress(item)}');
    modified = true;
  }

  // Add Modal JSX and styles
  const modalJsx = `            )}

            {/* NOTIFICATION POPUP MODAL */}
            <Modal
                visible={!!selectedNotif}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedNotif(null)}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedNotif(null)}>
                    <View style={styles.modalContent}>
                        {selectedNotif && (
                            <>
                                <View style={[styles.iconWrap, { backgroundColor: typeIcon(selectedNotif.type).bg, alignSelf: 'center', width: 60, height: 60, borderRadius: 30, marginRight: 0, marginBottom: 16 }]}>
                                    <Ionicons name={typeIcon(selectedNotif.type).name as any} size={32} color={typeIcon(selectedNotif.type).color} />
                                </View>
                                <Text style={styles.modalTitle}>{selectedNotif.title}</Text>
                                <Text style={styles.modalMsg}>{isHindi ? (selectedNotif.messageHi || selectedNotif.messageEn) : selectedNotif.messageEn}</Text>
                                
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setSelectedNotif(null)}>
                                        <Text style={styles.modalBtnPrimaryText}>{isHindi ? 'ठीक है' : 'Okay'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}`;
  if (!content.includes('NOTIFICATION POPUP MODAL')) {
    // find end of file return (View)
    content = content.replace(/            \)\}\r?\n        <\/View>\r?\n    \);\r?\n\}/, modalJsx);
    modified = true;
  }

  const modalStyles = `    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalMsg: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalActions: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalBtnPrimary: {
        flex: 1,
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});`;
  if (!content.includes('modalBackdrop')) {
    content = content.replace(/    \},\r?\n\}\);/, modalStyles);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Patched:', file);
  }
});
