/**
 * Mirrors {@code SdkUserGateActivity} in the native Bolt Earth UI SDK sample app:
 * collect {@code userId} → {@code clientID}, SDK token, environment, theme colour, and locale,
 * then call the same native entry points as the Kotlin bridge
 * ({@code BoltEarthUiSdk.initialize}, {@code openChargerBookingFlow}, {@code openUsersBookingsList},
 * {@code logout}).
 *
 * No credentials are committed in source; values persist locally (like SharedPreferences on Android)
 * after a successful run for developer convenience only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  initializeWithOptions,
  logout,
  presentBookingHistoryFlow,
  presentChargerFlow,
} from '@boltearth/react-native-sdk';

const PREFS = {
  USER_ID: 'sdk_sample_user_id',
  SDK_TOKEN: 'sdk_sample_sdk_token',
  THEME_COLOR: 'sdk_sample_theme_color',
  LANGUAGE: 'sdk_sample_language_tag',
  ENVIRONMENT: 'sdk_sample_environment',
} as const;

type EnvironmentChoice = 'staging' | 'production';

type LocaleChoice = {
  readonly languageTag: string;
  readonly label: string;
};

const LOCALE_CHOICES: LocaleChoice[] = [
  { languageTag: '', label: 'System default' },
  { languageTag: 'en', label: 'English' },
  { languageTag: 'hi', label: 'हिंदी' },
  { languageTag: 'mr', label: 'मराठी' },
  { languageTag: 'kn', label: 'ಕನ್ನಡ' },
  { languageTag: 'ta', label: 'தமிழ்' },
  { languageTag: 'te', label: 'తెలుగు' },
];

const PRESET_COLORS: ReadonlyArray<{ hex: string; label: string }> = [
  { hex: '#26C72D', label: 'Green' },
  { hex: '#2196F3', label: 'Blue' },
  { hex: '#E91E63', label: 'Pink' },
  { hex: '#FF6D00', label: 'Orange' },
  { hex: '#7B1FA2', label: 'Purple' },
  { hex: '#009688', label: 'Teal' },
  { hex: '#F44336', label: 'Red' },
  { hex: '#FF9800', label: 'Amber' },
];

const ENV_OPTIONS: ReadonlyArray<{
  value: EnvironmentChoice;
  label: string;
  hint: string;
}> = [
  {
    value: 'staging',
    label: 'Development',
    hint: 'Non-prod app id, dev hosts (like SdkEnvironment.Development)',
  },
  {
    value: 'production',
    label: 'Production',
    hint: 'Live hosts, real package id (like SdkEnvironment.Production)',
  },
];

function isValidHexColor(hex: string): boolean {
  if (!hex?.trim()) {
    return false;
  }
  try {
    const n = hex.trim();
    if (!n.startsWith('#') || (n.length !== 7 && n.length !== 9)) {
      return false;
    }
    const rest = n.slice(1);
    if (!/^[0-9A-Fa-f]+$/.test(rest)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function BoltSdkUserGate() {
  const [userId, setUserId] = useState('');
  const [sdkToken, setSdkToken] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentChoice>('staging');
  const [localeIndex, setLocaleIndex] = useState(0);
  const [localeModalVisible, setLocaleModalVisible] = useState(false);
  const [selectedColorHex, setSelectedColorHex] = useState(PRESET_COLORS[0].hex);
  const [customColorInput, setCustomColorInput] = useState(PRESET_COLORS[0].hex);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [busyAction, setBusyAction] = useState<
    null | 'booking' | 'list' | 'logout'
  >(null);

  const androidOnly =
    Platform.OS === 'android'
      ? null
      : 'Native BoltEarthUiSdk flows are implemented for Android in this sample. You can still edit the form to see how values map to initializeWithOptions.';

  useEffect(() => {
    const load = async () => {
      try {
        const [u, t, c, lang, env] = await Promise.all([
          AsyncStorage.getItem(PREFS.USER_ID),
          AsyncStorage.getItem(PREFS.SDK_TOKEN),
          AsyncStorage.getItem(PREFS.THEME_COLOR),
          AsyncStorage.getItem(PREFS.LANGUAGE),
          AsyncStorage.getItem(PREFS.ENVIRONMENT),
        ]);
        if (u) {
          setUserId(u);
        }
        if (t) {
          setSdkToken(t);
        }
        const color = c?.trim() || PRESET_COLORS[0].hex;
        if (isValidHexColor(color)) {
          setSelectedColorHex(color);
          setCustomColorInput(color);
        }
        if (env === 'production' || env === 'staging') {
          setEnvironment(env);
        }
        if (lang != null) {
          const idx = LOCALE_CHOICES.findIndex(o => o.languageTag === lang);
          setLocaleIndex(idx >= 0 ? idx : 0);
        }
      } finally {
        setPrefsLoaded(true);
      }
    };
    load().catch(() => {});
  }, []);

  const persistField = useCallback(async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  }, []);

  const resolvedPrimaryColor = isValidHexColor(customColorInput.trim())
    ? customColorInput.trim()
    : selectedColorHex;

  const buildInitOptions = useCallback(() => {
    const locale = LOCALE_CHOICES[localeIndex]?.languageTag ?? '';
    return {
      clientID: userId.trim(),
      sdkToken: sdkToken.trim(),
      environment,
      sdkThemeColorHex: resolvedPrimaryColor,
      ...(locale ? { language: locale } : {}),
    };
  }, [environment, localeIndex, resolvedPrimaryColor, sdkToken, userId]);

  const validate = useCallback((): boolean => {
    if (!userId.trim()) {
      Alert.alert('User ID required', 'Enter a User ID to continue.');
      return false;
    }
    if (!sdkToken.trim()) {
      Alert.alert(
        'SDK token required',
        'Paste your SDK API token (from your backend or host app secrets). Nothing is bundled in this sample repo.',
      );
      return false;
    }
    return true;
  }, [sdkToken, userId]);

  const savePrefs = useCallback(async () => {
    await persistField(PREFS.USER_ID, userId.trim());
    await persistField(PREFS.SDK_TOKEN, sdkToken.trim());
    await persistField(PREFS.THEME_COLOR, resolvedPrimaryColor);
    await persistField(
      PREFS.LANGUAGE,
      LOCALE_CHOICES[localeIndex]?.languageTag ?? '',
    );
    await persistField(PREFS.ENVIRONMENT, environment);
  }, [
    environment,
    localeIndex,
    persistField,
    resolvedPrimaryColor,
    sdkToken,
    userId,
  ]);

  const runOpenBooking = useCallback(async () => {
    if (!validate()) {
      return;
    }
    if (androidOnly) {
      Alert.alert('Android only', androidOnly);
      return;
    }
    setBusyAction('booking');
    try {
      await savePrefs();
      await initializeWithOptions(buildInitOptions());
      await presentChargerFlow();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Charger booking flow failed', message);
    } finally {
      setBusyAction(null);
    }
  }, [androidOnly, buildInitOptions, savePrefs, validate]);

  const runOpenBookingsList = useCallback(async () => {
    if (!validate()) {
      return;
    }
    if (androidOnly) {
      Alert.alert('Android only', androidOnly);
      return;
    }
    setBusyAction('list');
    try {
      await savePrefs();
      await initializeWithOptions(buildInitOptions());
      await presentBookingHistoryFlow();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Bookings list failed', message);
    } finally {
      setBusyAction(null);
    }
  }, [androidOnly, buildInitOptions, savePrefs, validate]);

  const runLogout = useCallback(async () => {
    if (androidOnly) {
      Alert.alert('Android only', androidOnly);
      return;
    }
    setBusyAction('logout');
    try {
      const ok = await logout();
      Alert.alert(
        'Logout',
        ok
          ? 'Session cleared (native logout completed successfully).'
          : 'Logout finished with a partial result; local state may still be cleared.',
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Logout failed', message);
    } finally {
      setBusyAction(null);
    }
  }, [androidOnly]);

  const swatchSelect = useCallback((hex: string) => {
    setSelectedColorHex(hex);
    setCustomColorInput(hex);
  }, []);

  const updateCustomColor = useCallback((text: string) => {
    setCustomColorInput(text);
    if (isValidHexColor(text)) {
      setSelectedColorHex(text.trim());
    }
  }, []);

  if (!prefsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const localeLabel = LOCALE_CHOICES[localeIndex]?.label ?? 'System default';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled">
      {androidOnly ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{androidOnly}</Text>
        </View>
      ) : null}

      <View style={styles.spacer48} />

      <Text style={styles.title}>Bolt Earth SDK sample</Text>

      <Text style={styles.inputLabel}>User ID</Text>
      <TextInput
        value={userId}
        onChangeText={setUserId}
        placeholder="Opaque user id (maps to BoltEarthUiSdk.initialize userId)"
        placeholderTextColor="#888"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <Text style={styles.inputLabel}>SDK token</Text>
      <TextInput
        value={sdkToken}
        onChangeText={setSdkToken}
        placeholder="Your API token (never commit real tokens in client samples)"
        placeholderTextColor="#888"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Environment</Text>
      <Text style={styles.sectionHint}>
        Passed as{' '}
        <Text style={styles.mono}>environment</Text> in{' '}
        <Text style={styles.mono}>initializeWithOptions</Text> → Android
        maps “production” to <Text style={styles.mono}>SdkEnvironment.Production</Text>
        , anything else to <Text style={styles.mono}>Development</Text>.
      </Text>
      <View style={styles.envRow}>
        {ENV_OPTIONS.map(opt => {
          const selected = environment === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setEnvironment(opt.value)}
              style={({ pressed }) => [
                styles.envChip,
                selected && styles.envChipSelected,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.envChipTitle,
                  selected && styles.envChipTitleOn,
                ]}>
                {opt.label}
              </Text>
              <Text style={styles.envChipHint}>{opt.hint}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>SDK UI language</Text>
      <Text style={styles.sectionHint}>
        Applies after you continue — forwarded as <Text style={styles.mono}>language</Text>{' '}
        (Android: <Text style={styles.mono}>localeLanguageTag</Text>).
      </Text>
      <Pressable
        onPress={() => setLocaleModalVisible(true)}
        style={({ pressed }) => [styles.localeButton, pressed && styles.pressed]}>
        <Text style={styles.localeButtonText}>{localeLabel}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal
        visible={localeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocaleModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLocaleModalVisible(false)}>
          <View style={styles.modalSheet}>
            <FlatList
              data={LOCALE_CHOICES}
              keyExtractor={item => item.languageTag || 'device'}
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalRow,
                    index === localeIndex && styles.modalRowSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setLocaleIndex(index);
                    setLocaleModalVisible(false);
                  }}>
                  <Text style={styles.modalRowText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Theme colour</Text>
      <Text style={styles.sectionHint}>
        Pick a preset or enter a custom hex value (maps to{' '}
        <Text style={styles.mono}>sdkThemeColorHex</Text> / Android{' '}
        <Text style={styles.mono}>primaryColor</Text>).
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.swatchStrip}
        contentContainerStyle={styles.swatchStripContent}>
        {PRESET_COLORS.map(opt => {
          const selected =
            opt.hex.toLowerCase() === selectedColorHex.toLowerCase();
          return (
            <Pressable
              key={opt.hex}
              accessibilityLabel={opt.label}
              onPress={() => swatchSelect(opt.hex)}
              style={({ pressed }) => [
                styles.swatchFrame,
                selected && {
                  borderColor: opt.hex,
                  borderWidth: 3,
                },
                pressed && styles.pressed,
              ]}>
              <View
                style={[styles.swatchCircle, { backgroundColor: opt.hex }]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.inputLabel}>Custom colour (#RRGGBB)</Text>
      <TextInput
        value={customColorInput}
        onChangeText={updateCustomColor}
        placeholder="#26C72D"
        placeholderTextColor="#888"
        autoCapitalize="none"
        style={styles.input}
      />

      <Pressable
        onPress={runOpenBooking}
        disabled={busyAction !== null}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || busyAction !== null) && styles.primaryButtonDim,
        ]}>
        {busyAction === 'booking' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Login User and Continue</Text>
        )}
      </Pressable>

      <Pressable
        onPress={runOpenBookingsList}
        disabled={busyAction !== null}
        style={({ pressed }) => [
          styles.secondaryButton,
          (pressed || busyAction !== null) && styles.secondaryButtonDim,
        ]}>
        {busyAction === 'list' ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.secondaryButtonText}>Booking List</Text>
        )}
      </Pressable>

      <Pressable
        onPress={runLogout}
        disabled={busyAction !== null}
        style={({ pressed }) => [
          styles.secondaryButton,
          (pressed || busyAction !== null) && styles.secondaryButtonDim,
        ]}>
        {busyAction === 'logout' ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.secondaryButtonText}>Logout</Text>
        )}
      </Pressable>

      <Text style={styles.footerHint}>
        Flow:{' '}
        <Text style={styles.mono}>initializeWithOptions</Text>
        {' → native '}
        <Text style={styles.mono}>BoltEarthUiSdk.initialize</Text>
        {' · then '}
        <Text style={styles.mono}>presentChargerFlow</Text>
        {' / '}
        <Text style={styles.mono}>presentBookingHistoryFlow</Text>
        {' · '}
        <Text style={styles.mono}>logout</Text>.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  spacer48: { height: 48 },
  noteBox: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noteText: { fontSize: 13, color: '#5D4037' },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  divider: {
    height: 1,
    backgroundColor: '#1A000000',
    marginTop: 24,
  },
  sectionLabel: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 18,
  },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },
  envRow: { marginTop: 12, gap: 10 },
  envChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  envChipSelected: {
    borderColor: '#111',
    backgroundColor: '#f5f5f5',
  },
  envChipTitle: { fontSize: 15, fontWeight: '600' },
  envChipTitleOn: { color: '#111' },
  envChipHint: { fontSize: 11, opacity: 0.6, marginTop: 4 },
  localeButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  localeButtonText: { fontSize: 16 },
  chevron: { fontSize: 14, opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 360,
    overflow: 'hidden',
  },
  modalRow: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  modalRowSelected: { backgroundColor: '#f0f7ff' },
  modalRowText: { fontSize: 16 },
  swatchStrip: { marginTop: 12 },
  swatchStripContent: { alignItems: 'center', gap: 10, paddingVertical: 4 },
  swatchFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonDim: { opacity: 0.75 },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#e8e8e8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonDim: { opacity: 0.75 },
  secondaryButtonText: { color: '#111', fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.85 },
  footerHint: {
    marginTop: 28,
    fontSize: 11,
    opacity: 0.55,
    lineHeight: 16,
  },
});
