import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { assignOrgUnitRole } from '@b2b/api-client';
import type { OrgUnitRoleType } from '@b2b/shared-types';
import { UserDisplayRow } from '../../../../components/UserDisplayRow';
import {
  PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND,
  BORDER_COLOR, BACKGROUND_COLOR,
} from '../../../../constants/colors';
import {
  ORG_UNIT_ROLES, getOrgUnitRoleLabel, getOrgUnitRoleIcon,
} from '../../../../constants/orgUnit';
import LocationChipPicker from '../../../../components/LocationChipPicker';
import { useLocations } from '../../../../hooks/useLocations';
import UserSearchModal, { PickedUser } from '../../../../components/UserSearchModal';

interface Props {
  visible: boolean;
  orgUnitId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignRoleModal({ visible, orgUnitId, onClose, onSuccess }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const { locations } = useLocations();

  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);
  const [role, setRole] = useState<OrgUnitRoleType>('teacher');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [effectiveTo, setEffectiveTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedUser(null);
      setRole('teacher');
      setLocationId(null);
      setIsPrimary(false);
      setEffectiveFrom(today());
      setEffectiveTo('');
      setPickerVisible(false);
    }
  }, [visible]);

  const handlePick = (u: PickedUser) => {
    setSelectedUser(u);
    if (!locationId && u.primary_location_id) {
      setLocationId(u.primary_location_id);
    }
  };

  const handleSave = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    if (!selectedUser) {
      Alert.alert('Validation', 'Please pick a user');
      return;
    }
    if (!isISODate(effectiveFrom)) {
      Alert.alert('Validation', 'Effective from must be YYYY-MM-DD');
      return;
    }
    if (effectiveTo && !isISODate(effectiveTo)) {
      Alert.alert('Validation', 'Effective to must be YYYY-MM-DD');
      return;
    }

    setSaving(true);
    try {
      await assignOrgUnitRole(companyId, orgUnitId, deviceId, accessToken, {
        user_id: selectedUser.user_id,
        role,
        location_id: locationId,
        is_primary: isPrimary,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
      });
      onSuccess();
    } catch (e: any) {
      // CHANGED: surface the backend message for 403/409 verbatim.
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to assign role';

      const title =
        status === 403 ? 'Location Not Authorized'
        : status === 409 ? 'Conflict'
        : 'Error';

      Alert.alert(title, msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Assign Role</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={22} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body}>
              <Text style={styles.label}>User *</Text>
              {selectedUser ? (
                <View style={styles.userCard}>
                  <UserDisplayRow
                    userId={selectedUser.user_id}
                    username={selectedUser.username}
                    fullName={selectedUser.full_name ?? undefined}
                    size={40}
                    style={{ flex: 1 }}
                    trailing={
                      <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={() => setPickerVisible(true)}
                      >
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>
                    }
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickBtn}
                  onPress={() => setPickerVisible(true)}
                >
                  <Icon name="account-search" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.pickBtnText}>Pick user</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>Role *</Text>
              <View style={styles.roleGrid}>
                {ORG_UNIT_ROLES.map((r) => {
                  const selected = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRole(r as OrgUnitRoleType)}
                      style={[styles.roleChip, selected && styles.roleChipActive]}
                    >
                      <Icon
                        name={getOrgUnitRoleIcon(r)}
                        size={16}
                        color={selected ? '#fff' : PRIMARY_COLOR}
                      />
                      <Text style={[styles.roleChipText, selected && { color: '#fff' }]}>
                        {getOrgUnitRoleLabel(r)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Location</Text>
              <Text style={styles.hint}>
                Optional per-assignment pin. When set, the user is explicitly
                authorized at this location for this role.
              </Text>
              <View style={{ marginTop: 6 }}>
                <LocationChipPicker
                  locations={locations}
                  value={locationId}
                  onChange={setLocationId}
                  allowNone
                  noneLabel="Not set"
                />
              </View>

              <View style={styles.primaryRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.label}>Primary role</Text>
                  <Text style={styles.hint}>
                    Mark as the user's main role. Unsets any other primary.
                  </Text>
                </View>
                <Switch
                  value={isPrimary}
                  onValueChange={setIsPrimary}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginTop: 16 }]}>Effective From *</Text>
                  <TextInput
                    style={styles.input}
                    value={effectiveFrom}
                    onChangeText={setEffectiveFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={TEXT_SECONDARY}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginTop: 16 }]}>Effective To</Text>
                  <TextInput
                    style={styles.input}
                    value={effectiveTo}
                    onChangeText={setEffectiveTo}
                    placeholder="Optional"
                    placeholderTextColor={TEXT_SECONDARY}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!selectedUser || saving) && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={!selectedUser || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <UserSearchModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePick}
        title="Assign Role · Pick User"
      />
    </>
  );
}

const today = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BACKGROUND_COLOR,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  closeButton: { padding: 4 },
  body: { padding: 20, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  hint: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, fontStyle: 'italic' },
  input: {
    borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: TEXT_PRIMARY, backgroundColor: '#fff',
  },
  row: { flexDirection: 'row' },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: PRIMARY_COLOR,
    backgroundColor: PRIMARY_COLOR + '08',
  },
  pickBtnText: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '600' },
  userCard: {
    padding: 12, borderRadius: 8,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1, borderColor: BORDER_COLOR,
  },
  changeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, backgroundColor: PRIMARY_COLOR + '15',
  },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: PRIMARY_COLOR },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: PRIMARY_COLOR, backgroundColor: '#fff',
  },
  roleChipActive: { backgroundColor: PRIMARY_COLOR },
  roleChipText: { fontSize: 13, fontWeight: '600', color: PRIMARY_COLOR },
  primaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, marginTop: 8,
    borderTopWidth: 1, borderTopColor: BORDER_COLOR,
  },
  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  saveBtn: {
    backgroundColor: PRIMARY_COLOR, alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});