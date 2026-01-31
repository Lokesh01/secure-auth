import React, { Suspense } from 'react';
import LoadingFallback from '@/components/fallback-component/page';
import ConfirmAccount from './_confirmAccount';

const page = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmAccount />
    </Suspense>
  );
};

export default page;
