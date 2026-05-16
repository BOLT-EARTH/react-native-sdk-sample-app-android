/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { NewAppScreen } from '@react-native/new-app-screen';
import {
  Alert,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  initializeWithOptions,
  presentChargerFlow,
} from '@boltearth/react-native-sdk';

/** Mirrors the Kotlin bridge demo credentials. */
const BOLT_CONFIG = {
  clientID: 'xyz123',
  sdkToken:
    '1234',
  environment: 'staging' as const, // → SdkEnvironment.Development on Android
  sdkThemeColorHex: '#000000',
  language: 'en',
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  /**
   * Mirrors the lifecycleScope.launch block in the Kotlin bridge:
   *   BoltEarthUiSdk.initialize(...)
   *   BoltEarthUiSdk.openChargerBookingFlow(this@MainActivity)
   */
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const run = async () => {
      try {
        await initializeWithOptions(BOLT_CONFIG);
        await presentChargerFlow();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Bolt Earth init failed', message);
      }
    };
    void run();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  const runBoltManually = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Bolt demo', 'BoltEarthUiSdk is available on Android only.');
      return;
    }
    try {
      await initializeWithOptions(BOLT_CONFIG);
      await presentChargerFlow();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Bolt demo failed', message);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
        <View style={styles.boltBar}>
          <Pressable
            style={({ pressed }) => [
              styles.boltButton,
              pressed && styles.boltButtonPressed,
            ]}
            onPress={() => {
              void runBoltManually();
            }}>
            <Text style={styles.boltButtonLabel}>
              Initialize + open charger booking
            </Text>
          </Pressable>
        </View>
      ) : null}
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  boltBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  boltButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  boltButtonPressed: {
    opacity: 0.85,
  },
  boltButtonLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default App;
