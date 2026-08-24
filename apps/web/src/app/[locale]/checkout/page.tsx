import { Suspense } from 'react';
import { CheckoutForm } from './CheckoutForm';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10 text-leaf-900/50">...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
