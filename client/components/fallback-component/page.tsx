// import { Loader } from 'lucide-react';

const LoadingFallback = () => (
  <main className="w-full min-h-[590px] h-full max-w-full flex items-center justify-center">
    <div className="w-full h-full p-5 rounded-md">
      <div className="flex items-center justify-center mb-8">
        <div className="size-[40px] rounded-lg flex items-center border-2 dark:border-gray-200 justify-center bg-gradient-to-br from-green-500 to-primary to-90%">
          <span className="font-bold text-gray-50" style={{ fontSize: '24px' }}>
            SA
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  </main>
);

export default LoadingFallback;
