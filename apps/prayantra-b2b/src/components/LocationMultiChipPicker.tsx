import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY,
  CARD_BACKGROUND, BORDER_COLOR,
} from '../constants/colors';
import type { LocationOption } from '../constants/orgUnit';

interface Props {
  locations: LocationOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Shown when `value` is empty, to explain the "empty = none" semantics. */
  emptyHint?: string;
  /** Cap the scroll height of the chip list; default 260. */
  maxHeight?: number;
}

/**
 * Multi-select location picker.
 *
 *   - Tap a chip to toggle it in / out of `value`.
 *   - Empty array is a valid selection (meaning "no locations").
 *   - The parent decides what empty means semantically (universal, etc.).
 *
 * Deliberately NOT rendering a "none" chip — clearing happens via the
 * "Clear all" affordance when `value.length > 0`.
 */
export default function LocationMultiChipPicker({
  locations,
  value,
  onChange,
  disabled = false,
  loading = false,
  emptyHint = 'Select one or more locations. Leave empty for universal.',
  maxHeight = 260,
}: Props) {
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.location_name.toLowerCase().includes(q) ||
        (l.location_code ?? '').toLowerCase().includes(q),
    );
  }, [locations, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading locations…</Text>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Icon name="map-marker-off-outline" size={18} color={TEXT_SECONDARY} />
        <Text style={styles.emptyText}>No locations available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* Selected summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryTextWrap}>
          {value.length === 0 ? (
            <Text style={styles.summaryEmpty}>No locations selected</Text>
          ) : (
            <Text style={styles.summaryText} numberOfLines={1}>
              {value.length} selected
            </Text>
          )}
        </View>
        {value.length > 0 && !disabled && (
          <TouchableOpacity onPress={clearAll} hitSlop={8} style={styles.clearBtn}>
            <Icon name="close-circle-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      {locations.length > 6 && (
        <View style={styles.searchWrap}>
          <Icon name="magnify" size={16} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search locations…"
            placeholderTextColor={TEXT_SECONDARY}
            value={query}
            onChangeText={setQuery}
            editable={!disabled}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={14} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chip grid */}
      <ScrollView
        style={{ maxHeight }}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <Text style={styles.noMatch}>No locations match "{query}"</Text>
        ) : (
          filtered.map((loc) => {
            const selected = selectedSet.has(loc.location_id);
            return (
              <TouchableOpacity
                key={loc.location_id}
                onPress={() => toggle(loc.location_id)}
                disabled={disabled}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.7}
              >
                {selected && (
                  <Icon name="check" size={13} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                  numberOfLines={1}
                >
                  {loc.location_name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {value.length === 0 && emptyHint && (
        <Text style={styles.hint}>{emptyHint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 10,
    backgroundColor: '#fff', padding: 10,
  },
  containerDisabled: { opacity: 0.5 },
  loadingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 20,
  },
  loadingText: { fontSize: 13, color: TEXT_SECONDARY },
  emptyBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 20, borderWidth: 1, borderStyle: 'dashed',
    borderColor: BORDER_COLOR, borderRadius: 10,
  },
  emptyText: { fontSize: 13, color: TEXT_SECONDARY },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 8, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  summaryTextWrap: { flex: 1, minWidth: 0 },
  summaryText: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY },
  summaryEmpty: { fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  clearText: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '500' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F6F9', borderRadius: 8,
    paddingHorizontal: 10, height: 34, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: TEXT_PRIMARY, paddingVertical: 0 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER_COLOR, backgroundColor: '#fff',
    maxWidth: '100%',
  },
  chipSelected: {
    backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  noMatch: { fontSize: 12, color: TEXT_SECONDARY, padding: 8 },
  hint: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 8, fontStyle: 'italic' },
});