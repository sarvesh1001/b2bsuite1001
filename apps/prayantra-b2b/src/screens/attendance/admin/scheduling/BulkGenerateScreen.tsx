import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

export default function BulkGenerateScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Icon name="information-outline" size={32} color={PRIMARY_COLOR} />
        </View>

        <Text style={styles.title}>Schedules are now computed on read</Text>

        <Text style={styles.body}>
          The old "generate schedule" job has been retired. Every day is now
          derived on demand from the rule chain:
        </Text>

        <View style={styles.chain}>
          <ChainRow n={1} label="User's work center (by date)" />
          <ChainRow n={2} label="Work center's shift mapping" />
          <ChainRow n={3} label="Shift template rules" />
          <ChainRow n={4} label="Location calendar" />
          <ChainRow n={5} label="Day-specific override (if any)" />
        </View>

        <Text style={styles.body}>
          Nothing is stored. To view a user's schedule, open the Schedule
          Preview screen and pick the user and date range. To change a day,
          create an override instead.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('AttendanceScheduleOverrides')}
        >
          <Icon name="calendar-edit" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Manage overrides</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AttendanceSchedulePreview')}
        >
          <Icon name="calendar-search" size={18} color={PRIMARY_COLOR} />
          <Text style={styles.ghostBtnText}>Preview a schedule</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ChainRow({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.chainRow}>
      <View style={styles.chainNum}>
        <Text style={styles.chainNumText}>{n}</Text>
      </View>
      <Text style={styles.chainLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  inner: { padding: 24, paddingTop: 40 },

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
    marginBottom: 20,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 14,
  },
  body: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },

  chain: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 10,
    marginBottom: 18,
  },
  chainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chainNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}18`,
  },
  chainNumText: { color: PRIMARY_COLOR, fontSize: 11, fontWeight: '800' },
  chainLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}06`,
    marginTop: 10,
  },
  ghostBtnText: { color: PRIMARY_COLOR, fontWeight: '800', fontSize: 14 },
});