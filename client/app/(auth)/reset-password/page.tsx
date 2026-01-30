import React, { Suspense } from 'react';
import LoadingFallback from '@/components/fallback-component/page';
import ResetPassword from './_resetPassword';

const page = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPassword />
    </Suspense>
  );
};

export default page;
