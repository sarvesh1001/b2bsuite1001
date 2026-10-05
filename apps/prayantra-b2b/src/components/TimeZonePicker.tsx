// src/components/TimeZonePicker.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  TIMEZONES,
  REGION_ORDER,
  TimezoneOption,
  TimezoneRegion,
} from '../constants/timezones';
import { getOffsetMinutes, formatOffset } from '../utils/timezone';
import {
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../constants/colors';

interface Props {
  /** IANA name, e.g. 'Asia/Kolkata'. Empty string = no selection. */
  value: string;
  onChange: (tz: string) => void;
  label?: string;
  hint?: string;
  /** If true, disable interaction. */
  disabled?: boolean;
  /** Optional: absolute fallback shown when value is empty. */
  placeholder?: string;
}

export function TimeZonePicker({
  value,
  onChange,
  label,
  hint,
  disabled,
  placeholder = 'Pick a timezone',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter(
      (tz) =>
        tz.name.toLowerCase().includes(q) ||
        (tz.note && tz.note.toLowerCase().includes(q)),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<TimezoneRegion, TimezoneOption[]>> = {};
    for (const tz of filtered) {
      (groups[tz.region] = groups[tz.region] || []).push(tz);
    }
    return groups;
  }, [filtered]);

  const currentOffset = value
    ? formatOffset(getOffsetMinutes(new Date(), value))
    : null;

  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.85}
      >
        <Icon name="earth" size={16} color={PRIMARY_COLOR} />
        <Text
          style={[styles.inputText, !value && styles.inputPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {currentOffset ? (
          <Text style={styles.inputOffset}>{currentOffset}</Text>
        ) : null}
        <Icon name="chevron-down" size={16} color={TEXT_SECONDARY} />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setOpen(false);
          setSearch('');
        }}
      >
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.card} edges={['bottom']}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <Text style={styles.title}>Timezone</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Icon name="magnify" size={16} color={TEXT_SECONDARY} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city or offset"
                placeholderTextColor={TEXT_SECONDARY}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon
                    name="close-circle"
                    size={16}
                    color={TEXT_SECONDARY}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No timezones match "{search}"</Text>
              ) : null}

              {REGION_ORDER.map((region) => {
                const items = grouped[region];
                if (!items || items.length === 0) return null;
                return (
                  <View key={region}>
                    <Text style={styles.regionLabel}>{region}</Text>
                    {items.map((tz) => {
                      const active = value === tz.name;
                      const offset = formatOffset(
                        getOffsetMinutes(new Date(), tz.name),
                      );
                      return (
                        <TouchableOpacity
                          key={tz.name}
                          style={[styles.row, active && styles.rowActive]}
                          activeOpacity={0.85}
                          onPress={() => {
                            onChange(tz.name);
                            setOpen(false);
                            setSearch('');
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.rowText,
                                active && { color: PRIMARY_COLOR },
                              ]}
                            >
                              {tz.name}
                            </Text>
                            {tz.note ? (
                              <Text style={styles.rowNote}>{tz.note}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.rowOffset}>{offset}</Text>
                          {active ? (
                            <Icon
                              name="check-circle"
                              size={16}
                              color={PRIMARY_COLOR}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hint: { color: TEXT_SECONDARY, fontSize: 11, marginBottom: 8 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { flex: 1, color: TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  inputPlaceholder: { color: TEXT_SECONDARY, fontWeight: '400' },
  inputOffset: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontFamily: 'Courier',
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { flex: 1, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    paddingVertical: 0,
  },
  regionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowActive: { backgroundColor: 'rgba(0,180,219,0.08)' },
  rowText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  rowNote: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  rowOffset: { color: TEXT_SECONDARY, fontSize: 11, fontFamily: 'Courier' },
  empty: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 30,
  },
});