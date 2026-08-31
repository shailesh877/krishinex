// app/lead-generation.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const SHADOW_COLOR = '#00000020';

type LoanPurposeKey =
  | 'kcc'
  | 'tractor'
  | 'pashupalan'
  | 'solar'
  | 'other';

export default function LeadGenerationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  // 1. Personal details
  const [farmerName, setFarmerName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pan, setPan] = useState('');

  // 2. Land & farming
  const [landSize, setLandSize] = useState('');
  const [landType, setLandType] = useState<'irrigated' | 'unirrigated' | ''>('');
  const [khatauni, setKhatauni] = useState('');
  const [crops, setCrops] = useState('');
  const [irrigation, setIrrigation] = useState('');

  // 3. Loan requirements
  const [loanPurpose, setLoanPurpose] = useState<LoanPurposeKey | null>(null);
  const [otherPurpose, setOtherPurpose] = useState('');
  const [loanAmount, setLoanAmount] = useState('');

  // 4. Financial history
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [hasExistingLoan, setHasExistingLoan] = useState<'yes' | 'no' | ''>('');
  const [existingLoanDetails, setExistingLoanDetails] = useState('');

  // 5. Income details
  const [farmingMonthlyIncome, setFarmingMonthlyIncome] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [familyMonthlyIncome, setFamilyMonthlyIncome] = useState('');
  const [annualTurnover, setAnnualTurnover] = useState('');

  const purposeLabel = (key: LoanPurposeKey) => {
    if (!hi) {
      if (key === 'kcc') return 'Crop Loan (KCC)';
      if (key === 'tractor') return 'Tractor / Machinery';
      if (key === 'pashupalan') return 'Animal Husbandry';
      if (key === 'solar') return 'Solar Pump';
      return 'Other (e.g. drip irrigation)';
    }
    if (key === 'kcc') return 'फसल के लिए (KCC)';
    if (key === 'tractor') return 'ट्रैक्टर / मशीनरी के लिए';
    if (key === 'pashupalan') return 'पशुपालन (गाय/भैंस) के लिए';
    if (key === 'solar') return 'सोलर पंप के लिए';
    return 'अन्य (जैसे ड्रिप इरिगेशन)';
  };

  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    // farmerName — required, min 2 chars
    if (!farmerName.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया किसान का नाम भरें' : 'Please enter farmer name');
      return false;
    }
    if (farmerName.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
      return false;
    }

    // mobile — required, 10 digits
    const mobileClean = mobile.trim().replace(/\D/g, '');
    if (!mobileClean || mobileClean.length !== 10) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return false;
    }

    // aadhaar — required, 12 digits
    const aadhaarClean = aadhaar.trim().replace(/\D/g, '');
    if (!aadhaarClean || aadhaarClean.length !== 12) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'आधार नंबर 12 अंकों का होना चाहिए' : 'Aadhaar number must be exactly 12 digits');
      return false;
    }

    // fullAddress — required, min 5 chars
    if (!fullAddress.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया पता दर्ज करें' : 'Please enter address');
      return false;
    }
    if (fullAddress.trim().length < 5) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'पता कम से कम 5 अक्षर का होना चाहिए' : 'Address must be at least 5 characters');
      return false;
    }

    // landSize — required, > 0
    const landNum = parseFloat(landSize.trim());
    if (!landSize.trim() || isNaN(landNum) || landNum <= 0) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही जमीन का आकार भरें (0 से अधिक)' : 'Please enter a valid land size (greater than 0)');
      return false;
    }

    // loanAmount — required, > 0
    const loanNum = parseFloat(loanAmount.trim());
    if (!loanAmount.trim() || isNaN(loanNum) || loanNum <= 0) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही लोन राशि भरें (0 से अधिक)' : 'Please enter a valid loan amount (greater than 0)');
      return false;
    }

    // pan — optional, exactly 10 chars if filled
    if (pan.trim() && pan.trim().length !== 10) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'पैन कार्ड 10 अक्षरों का होना चाहिए' : 'PAN must be exactly 10 characters');
      return false;
    }

    // bankAccount — optional, 9-18 digits if filled
    if (bankAccount.trim()) {
      const accClean = bankAccount.trim().replace(/\D/g, '');
      if (accClean.length < 9 || accClean.length > 18) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'खाता नंबर 9 से 18 अंकों का होना चाहिए' : 'Bank account number must be 9 to 18 digits');
        return false;
      }
    }

    if (!loanPurpose) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'लोन का उद्देश्य चुनें' : 'Please select loan purpose');
      return false;
    }
    if (loanPurpose === 'other' && !otherPurpose.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'अन्य उद्देश्य लिखें' : 'Please specify other purpose');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        farmerName,
        fatherName,
        mobile,
        aadhaar,
        fullAddress,
        pan,
        landSize,
        landType,
        khatauni,
        crops,
        irrigation,
        loanPurpose,
        otherPurpose,
        loanAmount: Number(loanAmount),
        bankAccount,
        bankName,
        hasExistingLoan,
        existingLoanDetails,
        farmingMonthlyIncome,
        otherIncome,
        familyMonthlyIncome,
        annualTurnover
      };

      await authApi.submitLoanLead(payload);

      showAlert(
        hi ? 'फॉर्म सबमिट हो गया' : 'Form Submitted',
        hi
          ? 'आपकी लोन रिक्वेस्ट सेव हो गई है, टीम जल्द ही संपर्क करेगी।'
          : 'Your loan lead has been saved, our team will contact you soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

      // optional: reset
      setFarmerName('');
      setFatherName('');
      setMobile('');
      setAadhaar('');
      setFullAddress('');
      setPan('');
      setLandSize('');
      setLandType('');
      setKhatauni('');
      setCrops('');
      setIrrigation('');
      setLoanPurpose(null);
      setOtherPurpose('');
      setLoanAmount('');
      setBankAccount('');
      setBankName('');
      setHasExistingLoan('');
      setExistingLoanDetails('');
      setFarmingMonthlyIncome('');
      setOtherIncome('');
      setFamilyMonthlyIncome('');
      setAnnualTurnover('');
    } catch (error: any) {
      console.error('Submit loan lead error:', error);
      showAlert(
        hi ? 'Error' : 'Error',
        hi ? 'फॉर्म सबमिट करने में विफल' : 'Failed to submit form'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const t = {
    title: hi ? 'लोन लीड फॉर्म' : 'Loan Lead Form',
    section1: hi ? '1. व्यक्तिगत जानकारी' : '1. Personal Details',
    section2: hi ? '2. खेती और जमीन का विवरण' : '2. Land & Farming Details',
    section3: hi ? '3. लोन की जरूरत' : '3. Loan Requirements',
    section4: hi ? '4. पिछला बैंकिंग रिकॉर्ड' : '4. Financial History',
    section5: hi ? '5. आय का विवरण' : '5. Income Details',
    submit: hi ? 'फॉर्म सबमिट करें' : 'Submit Form',
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('../loan-history')}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={20} color={GREEN_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.section1}</Text>

          <Text style={styles.label}>
            {hi ? 'किसान का पूरा नाम*' : 'Farmer Full Name*'}
          </Text>
          <TextInput
            style={styles.input}
            value={farmerName}
            onChangeText={setFarmerName}
            placeholder={
              hi
                ? 'आधार कार्ड के अनुसार नाम'
                : 'As per Aadhaar card'
            }
          />

          <Text style={styles.label}>
            {hi ? 'पिता/पति का नाम' : 'Father / Spouse Name'}
          </Text>
          <TextInput
            style={styles.input}
            value={fatherName}
            onChangeText={setFatherName}
            placeholder={hi ? 'पिता/पति का पूरा नाम' : 'Full name'}
          />

          <Text style={styles.label}>
            {hi ? 'मोबाइल नंबर*' : 'Mobile Number*'}
          </Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder={hi ? 'आधार से लिंक मोबाइल' : 'Aadhaar linked mobile'}
          />

          <Text style={styles.label}>
            {hi ? 'आधार नंबर*' : 'Aadhaar Number*'}
          </Text>
          <TextInput
            style={styles.input}
            value={aadhaar}
            onChangeText={setAadhaar}
            keyboardType="number-pad"
            placeholder="XXXX XXXX XXXX"
          />

          <Text style={styles.label}>
            {hi ? 'पूरा पता*' : 'Full Address*'}
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={fullAddress}
            onChangeText={setFullAddress}
            multiline
            placeholder={
              hi ? 'गांव, तहसील, जिला' : 'Village, Tehsil, District'
            }
          />

          <Text style={styles.label}>
            {hi ? 'पैन कार्ड' : 'PAN Card'}
          </Text>
          <TextInput
            style={styles.input}
            value={pan}
            onChangeText={setPan}
            autoCapitalize="characters"
            placeholder="ABCDE1234F"
          />
        </View>

        {/* SECTION 2 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.section2}</Text>

          <Text style={styles.label}>
            {hi ? 'कुल जमीन (एकड़/बीघा)*' : 'Total Land (Acre/Bigha)*'}
          </Text>
          <TextInput
            style={styles.input}
            value={landSize}
            onChangeText={setLandSize}
            placeholder={hi ? 'जैसे: 5 एकड़' : 'e.g. 5 acre'}
          />

          <Text style={styles.label}>
            {hi ? 'जमीन का प्रकार*' : 'Type of Land*'}
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                landType === 'irrigated' && styles.chipActive,
              ]}
              onPress={() => setLandType('irrigated')}
            >
              <Text
                style={[
                  styles.chipText,
                  landType === 'irrigated' && styles.chipTextActive,
                ]}
              >
                {hi ? 'सिंचित' : 'Irrigated'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chip,
                landType === 'unirrigated' && styles.chipActive,
              ]}
              onPress={() => setLandType('unirrigated')}
            >
              <Text
                style={[
                  styles.chipText,
                  landType === 'unirrigated' && styles.chipTextActive,
                ]}
              >
                {hi ? 'असिंचित' : 'Unirrigated'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {hi ? 'खतौनी/जमाबंदी नंबर' : 'Khatauni / Jamabandi No.'}
          </Text>
          <TextInput
            style={styles.input}
            value={khatauni}
            onChangeText={setKhatauni}
            placeholder={hi ? 'जमीन कागज का नंबर' : 'Land record number'}
          />

          <Text style={styles.label}>
            {hi ? 'प्रमुख फसलें' : 'Major Crops'}
          </Text>
          <TextInput
            style={styles.input}
            value={crops}
            onChangeText={setCrops}
            placeholder={
              hi ? 'जैसे: गेहूं, धान, गन्ना' : 'e.g. wheat, paddy, sugarcane'
            }
          />

          <Text style={styles.label}>
            {hi ? 'सिंचाई का साधन' : 'Irrigation Source'}
          </Text>
          <TextInput
            style={styles.input}
            value={irrigation}
            onChangeText={setIrrigation}
            placeholder={
              hi
                ? 'ट्यूबवेल, नहर, बारिश पर निर्भर'
                : 'Tube well, canal, rain-fed'
            }
          />
        </View>

        {/* SECTION 3 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.section3}</Text>

          <Text style={styles.label}>
            {hi ? 'लोन का उद्देश्य*' : 'Loan Purpose*'}
          </Text>

          {(['kcc', 'tractor', 'pashupalan', 'solar', 'other'] as LoanPurposeKey[]).map(
            (key) => (
              <TouchableOpacity
                key={key}
                style={styles.optionRow}
                onPress={() => setLoanPurpose(key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    loanPurpose === key
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={18}
                  color={loanPurpose === key ? GREEN_DARK : '#9CA3AF'}
                />
                <Text style={styles.optionText}>{purposeLabel(key)}</Text>
              </TouchableOpacity>
            ),
          )}

          {loanPurpose === 'other' && (
            <>
              <Text style={styles.label}>
                {hi ? 'अन्य उद्देश्य लिखें' : 'Specify other purpose'}
              </Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={otherPurpose}
                onChangeText={setOtherPurpose}
                multiline
                placeholder={
                  hi
                    ? 'ड्रिप इरिगेशन, ग्रीनहाउस आदि'
                    : 'Drip irrigation, greenhouse etc.'
                }
              />
            </>
          )}

          <Text style={styles.label}>
            {hi ? 'लोन की अनुमानित राशि*' : 'Expected Loan Amount*'}
          </Text>
          <TextInput
            style={styles.input}
            value={loanAmount}
            onChangeText={setLoanAmount}
            keyboardType="number-pad"
            placeholder={hi ? 'कितने रुपये चाहिए?' : 'Amount in INR'}
          />
        </View>

        {/* SECTION 4 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.section4}</Text>

          <Text style={styles.label}>
            {hi ? 'बैंक खाता नंबर' : 'Bank Account Number'}
          </Text>
          <TextInput
            style={styles.input}
            value={bankAccount}
            onChangeText={setBankAccount}
            keyboardType="number-pad"
            placeholder="XXXXXXXXXXXX"
          />

          <Text style={styles.label}>
            {hi ? 'बैंक का नाम' : 'Bank Name'}
          </Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder={hi ? 'जैसे: SBI, PNB' : 'e.g. SBI, PNB'}
          />

          <Text style={styles.label}>
            {hi ? 'क्या पहले से कोई लोन चल रहा है?' : 'Any existing loan?'}
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                hasExistingLoan === 'yes' && styles.chipActive,
              ]}
              onPress={() => setHasExistingLoan('yes')}
            >
              <Text
                style={[
                  styles.chipText,
                  hasExistingLoan === 'yes' && styles.chipTextActive,
                ]}
              >
                {hi ? 'हाँ' : 'Yes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chip,
                hasExistingLoan === 'no' && styles.chipActive,
              ]}
              onPress={() => setHasExistingLoan('no')}
            >
              <Text
                style={[
                  styles.chipText,
                  hasExistingLoan === 'no' && styles.chipTextActive,
                ]}
              >
                {hi ? 'नहीं' : 'No'}
              </Text>
            </TouchableOpacity>
          </View>

          {hasExistingLoan === 'yes' && (
            <>
              <Text style={styles.label}>
                {hi ? 'यदि हाँ, कहाँ से और कितना?' : 'If yes, from where and how much?'}
              </Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={existingLoanDetails}
                onChangeText={setExistingLoanDetails}
                multiline
                placeholder={
                  hi
                    ? 'बैंक/संस्था का नाम और बाकी राशि'
                    : 'Name of bank/NBFC and outstanding amount'
                }
              />
            </>
          )}
        </View>

        {/* SECTION 5 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.section5}</Text>

          <Text style={styles.label}>
            {hi
              ? 'खेती से औसत मासिक आय'
              : 'Average Monthly Income from Farming'}
          </Text>
          <TextInput
            style={styles.input}
            value={farmingMonthlyIncome}
            onChangeText={setFarmingMonthlyIncome}
            keyboardType="number-pad"
            placeholder={hi ? 'रुपये में' : 'In INR'}
          />

          <Text style={styles.label}>
            {hi
              ? 'अन्य स्रोतों से आय'
              : 'Income from other sources'}
          </Text>
          <TextInput
            style={styles.input}
            value={otherIncome}
            onChangeText={setOtherIncome}
            keyboardType="number-pad"
            placeholder={
              hi ? 'दूध, मजदूरी, बिजनेस आदि' : 'Milk, wages, small business etc.'
            }
          />

          <Text style={styles.label}>
            {hi
              ? 'कुल मासिक पारिवारिक आय'
              : 'Total Monthly Family Income'}
          </Text>
          <TextInput
            style={styles.input}
            value={familyMonthlyIncome}
            onChangeText={setFamilyMonthlyIncome}
            keyboardType="number-pad"
            placeholder={hi ? 'खेती + अन्य काम' : 'Farming + other work'}
          />

          <Text style={styles.label}>
            {hi
              ? 'सालाना टर्नओवर (फसल बिक्री)'
              : 'Annual Turnover (crop sales)'}
          </Text>
          <TextInput
            style={styles.input}
            value={annualTurnover}
            onChangeText={setAnnualTurnover}
            keyboardType="number-pad"
            placeholder={
              hi ? 'साल भर की कुल बिक्री' : 'Total sales in a year'
            }
          />
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          activeOpacity={0.9}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>{t.submit}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  input: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  submitBtn: {
    marginTop: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: GREEN_DARK,
    paddingVertical: 12,
  },
  submitText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  historyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
