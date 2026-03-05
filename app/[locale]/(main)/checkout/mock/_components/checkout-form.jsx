'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toastError, toastSuccess } from '@/lib/toast-helpers';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

export function CheckoutForm({ courseId, coursePrice, courseTitle, userId, userEmail, userName }) {
  const router = useRouter();
  const t = useTranslations('Checkout');
  const [isPending, startTransition] = useTransition();
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setError('');
    startTransition(async () => {
      try {
        const response = await fetch('/api/payments/mock/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            simulateFailure,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMsg = data.error || data.message || t('paymentFailed');
          setError(errorMsg);
          toastError(t('paymentFailed'), errorMsg);
          return;
        }

        // Success - redirect to success page
        toastSuccess(t('paymentSuccessful'), t('enrolledInCourse'));
        router.push(`/enroll-success?referenceId=${data.referenceId}&courseId=${courseId}`);
      } catch (err) {
        const errorMsg = err?.message || t('paymentFailed');
        setError(errorMsg);
        toastError(t('paymentFailed'), errorMsg);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="space-y-2">
        <Label>{t('customerName')}</Label>
        <div className="text-sm text-muted-foreground">{userName}</div>
      </div>

      <div className="space-y-2">
        <Label>{t('email')}</Label>
        <div className="text-sm text-muted-foreground">{userEmail}</div>
      </div>

      {/* Payment Amount */}
      <div className="space-y-2">
        <Label>{t('amountToPay')}</Label>
        <div className="text-2xl font-bold">${coursePrice.toFixed(2)}</div>
      </div>

      {/* Simulation Toggle */}
      <div className="flex items-center gap-x-2 p-4 border rounded-md bg-muted/50">
        <Checkbox
          id="simulate-failure"
          checked={simulateFailure}
          onCheckedChange={(checked) => setSimulateFailure(checked === true)}
        />
        <Label
          htmlFor="simulate-failure"
          className="text-sm font-normal cursor-pointer"
        >
          {t('simulateFailure')}
        </Label>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          {t('simulatedPaymentInfo')}
        </AlertDescription>
      </Alert>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 me-2 animate-spin" />
            {t('processing')}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 me-2" />
            {t('payNowSimulated')}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {t('payNowDisclaimer')}
      </p>
    </div>
  );
}

