"use client";

import { useEffect, useEffectEvent } from "react";

import { isExpenseClaimPending } from "@/lib/expense/presentation";
import type {
  ExpenseClaimDetail,
  ExpenseClaimListItem,
} from "@/lib/expense/types";

type UseExpenseClaimPollingOptions = {
  claims: ExpenseClaimListItem[];
  intervalMs?: number;
  refreshClaims: () => Promise<unknown>;
  refreshSelectedClaim: (claimId: string) => Promise<unknown>;
  selectedClaim: ExpenseClaimDetail | null;
  selectedClaimId: string | null;
};

export function useExpenseClaimPolling({
  claims,
  intervalMs = 2500,
  refreshClaims,
  refreshSelectedClaim,
  selectedClaim,
  selectedClaimId,
}: UseExpenseClaimPollingOptions) {
  const handleTick = useEffectEvent(() => {
    void refreshClaims();

    if (selectedClaimId) {
      void refreshSelectedClaim(selectedClaimId);
    }
  });

  useEffect(() => {
    const hasPendingClaim =
      claims.some((claim) => isExpenseClaimPending(claim.status)) ||
      (selectedClaim ? isExpenseClaimPending(selectedClaim.status) : false);

    if (!hasPendingClaim) {
      return;
    }

    const timer = window.setInterval(() => {
      handleTick();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [claims, handleTick, intervalMs, selectedClaim]);
}
