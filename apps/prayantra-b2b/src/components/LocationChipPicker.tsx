import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../constants/colors';
import type { LocationOption } from '../constants/orgUnit';

interface Props {
  locations: LocationOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
}

export default function LocationChipPicker({
  locations,
  value,
  onChange,
  allowNone = true,
  noneLabel = 'Universal (no restriction)',
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {allowNone && (
        <TouchableOpacity
          onPress={() => onChange(null)}
          style={[styles.chip, value === null && styles.chipActive]}
        >
          <Icon
            name="earth"
            size={16}
            color={value === null ? '#fff' : PRIMARY_COLOR}
          />
          <Text style={[styles.chipText, value === null && styles.chipTextActive]}>
            {noneLabel}
          </Text>
        </TouchableOpacity>
      )}
      {locations.map((l) => {
        const selected = value === l.location_id;
        return (
          <TouchableOpacity
            key={l.location_id}
            onPress={() => onChange(l.location_id)}
            style={[styles.chip, selected && styles.chipActive]}
          >
            <Icon
              name="map-marker"
              size={16}
              color={selected ? '#fff' : PRIMARY_COLOR}
            />
            <Text
              style={[styles.chipText, selected && styles.chipTextActive]}
              numberOfLines={1}
            >
              {l.location_name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#fff',
    maxWidth: 220,
  },
  chipActive: { backgroundColor: PRIMARY_COLOR },
  chipText: { fontSize: 13, fontWeight: '600', color: PRIMARY_COLOR },
  chipTextActive: { color: '#fff' },
});