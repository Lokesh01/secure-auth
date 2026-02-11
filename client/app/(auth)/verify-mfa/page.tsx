import React, { Suspense } from 'react';
import VerifyMFA from './_verifyMFA';
import LoadingFallback from '@/components/fallback-component/page';

const page = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyMFA />
    </Suspense>
  );
};

export default page;
