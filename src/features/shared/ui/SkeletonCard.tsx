import * as React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="flex h-[550px] w-full animate-pulse flex-col justify-between rounded-[40px] border border-zinc-100 bg-zinc-50 p-6">
    <div className="flex flex-col items-center">
      <div className="mb-2 h-8 w-48 rounded-lg bg-zinc-200" />
      <div className="h-4 w-24 rounded-md bg-zinc-100" />
    </div>

    <div className="flex flex-1 items-center justify-center">
      <div className="h-64 w-64 rounded-full bg-zinc-200 opacity-50" />
    </div>

    <div className="flex justify-center">
      <div className="h-12 w-32 rounded-full bg-zinc-200" />
    </div>
  </div>
);

export default SkeletonCard;
