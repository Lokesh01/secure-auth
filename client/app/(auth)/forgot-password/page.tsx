import React, { Suspense } from 'react';
import ForgotPassword from './_forgotPassword';
import LoadingFallback from '@/components/fallback-component/page';

const page = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPassword />
    </Suspense>
  );
};

export default page;
