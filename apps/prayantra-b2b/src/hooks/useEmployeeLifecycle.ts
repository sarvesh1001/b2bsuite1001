// apps/prayantra-b2b/src/hooks/useEmployeeLifecycle.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getEmployeeStatusNow,
  confirmProbation,
  failProbation,
  extendProbation,
  startNotice,
  cancelNotice,
  startOnHold,
  endOnHold,
} from '@b2b/api-client';
import type {
  ConfirmProbationRequest,
  FailProbationRequest,
  ExtendProbationRequest,
  StartNoticeRequest,
  CancelNoticeRequest,
  StartOnHoldRequest,
} from '@b2b/shared-types';
import { useUserAuthStore } from '../store/userAuthStore';

export const useEmployeeLifecycle = (
  employeeProfileId: string | undefined,
  employeeUserId: string | undefined,
) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const qc = useQueryClient();

  const enabled =
    !!employeeProfileId && !!accessToken && !!deviceId && !!companyId;

  const queryKey = ['employeeStatusNow', companyId, employeeProfileId] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      getEmployeeStatusNow(companyId!, employeeProfileId!, deviceId!, accessToken!),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Any lifecycle change invalidates:
  //   - this employee's status
  //   - the reminder feed + count (MarkActioned flips rows server-side)
  //   - the employee list (status pill on the card)
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['employeeStatusNow'] });
    qc.invalidateQueries({ queryKey: ['reminderFeed'] });
    qc.invalidateQueries({ queryKey: ['reminderCounts'] });
    qc.invalidateQueries({ queryKey: ['hrEmployeeList'] });
    if (employeeUserId) {
      qc.invalidateQueries({ queryKey: ['employee', employeeUserId] });
    }
  };

  const confirm = async (payload: ConfirmProbationRequest = {}) => {
    if (!enabled) return;
    await confirmProbation(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const fail = async (payload: FailProbationRequest) => {
    if (!enabled) return;
    await failProbation(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const extend = async (payload: ExtendProbationRequest) => {
    if (!enabled) return;
    await extendProbation(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const noticeStart = async (payload: StartNoticeRequest) => {
    if (!enabled) return;
    await startNotice(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const noticeCancel = async (payload: CancelNoticeRequest = {}) => {
    if (!enabled) return;
    await cancelNotice(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const onHoldStart = async (payload: StartOnHoldRequest) => {
    if (!enabled) return;
    await startOnHold(companyId!, employeeProfileId!, deviceId!, accessToken!, payload);
    invalidate();
  };

  const onHoldEnd = async () => {
    if (!enabled) return;
    await endOnHold(companyId!, employeeProfileId!, deviceId!, accessToken!);
    invalidate();
  };

  return {
    status: data?.data,
    isLoading,
    error,
    refetch,
    confirm,
    fail,
    extend,
    noticeStart,
    noticeCancel,
    onHoldStart,
    onHoldEnd,
  };
};