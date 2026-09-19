import {
    syncBiometricData,
    ingestBatch,
    sendHeartbeat,
  } from '@b2b/api-client';
  import { getPendingAttendance, markSynced, insertEmployee, clearEmployees, getDeviceMetadata, setDeviceMetadata } from './DatabaseService';
  
  // Local interface to match the actual API response
  interface BiometricSyncResponse {
    data: {
      employees: Array<{
        id: string;
        embedding: number[];
        name?: string;
        department?: string;
      }>;
    };
  }
  
  export class SyncManager {
    private deviceToken: string;
    private companyId: string;
    private deviceId: string;
  
    constructor(deviceToken: string, companyId: string, deviceId: string) {
      this.deviceToken = deviceToken;
      this.companyId = companyId;
      this.deviceId = deviceId;
    }
  
    async fullSync() {
      try {
        await this.syncAttendance();
        await this.syncEmployees();
        await this.sendHeartbeat();
      } catch (e) {
        console.error('[SyncManager] Full sync failed', e);
      }
    }
  
    private async syncAttendance() {
      const pending = await getPendingAttendance();
      if (pending.length === 0) return;
  
      const batchRef = `BATCH_${Date.now()}`;
      const events = pending.map(rec => ({
        event_type: 'check_in' as const,   // ✅ literal type
        event_time: rec.timestamp,
        external_ref: rec.employee_id,
      }));
  
      try {
        await ingestBatch(
          this.companyId,
          this.deviceId,
          { batch_ref: batchRef, events },
          this.deviceToken
        );
        for (const rec of pending) {
          await markSynced(rec.id);
        }
      } catch (e) {
        console.error('[SyncManager] Attendance sync failed', e);
      }
    }
  
    private async syncEmployees() {
      try {
        const lastSync = await getDeviceMetadata('last_employee_sync') || '';
  
        // The API expects device_id and model_version; last_synced_at is optional.
        // We send it as an extra field using a type assertion.
        const payload = {
          device_id: this.deviceId,
          model_version: 'mobilefacenet_v1',
          last_synced_at: lastSync,
        } as any; // ✅ adjust if you extend the type
  
        const response = await syncBiometricData(
          this.companyId,
          this.deviceId,
          payload,
          this.deviceToken
        );
  
        // Cast response to our local interface
        const typedResponse = response as unknown as BiometricSyncResponse;
        const employees = typedResponse.data.employees || [];
  
        await clearEmployees();
        for (const emp of employees) {
          await insertEmployee({
            id: emp.id,
            name: emp.name || emp.id,
            department: emp.department || '',
            embedding: new Float32Array(emp.embedding),
          });
        }
        await setDeviceMetadata('last_employee_sync', new Date().toISOString());
      } catch (e) {
        console.error('[SyncManager] Employee sync failed', e);
      }
    }
  
    private async sendHeartbeat() {
      try {
        await sendHeartbeat(
          this.companyId,
          this.deviceId,
          {
            device_time: new Date().toISOString(),
            firmware_version: '1.0.0',
            ip_address: '192.168.1.100',
          },
          this.deviceToken
        );
      } catch (e) {
        console.error('[SyncManager] Heartbeat failed', e);
      }
    }
  }