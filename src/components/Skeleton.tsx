import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4 p-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1">
              <Skeleton 
                height={colIndex === 0 ? 40 : 16} 
                width={colIndex === 0 ? 40 : '80%'}
                variant={colIndex === 0 ? 'circular' : 'text'}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <Skeleton height={12} width="40%" className="mb-2" />
      <Skeleton height={24} width="60%" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={12} width="60%" className="mb-2" />
          <Skeleton height={28} width="40%" />
        </div>
        <Skeleton height={40} width={40} variant="circular" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-100">
          <Skeleton height={48} width={48} variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <Skeleton height={20} width="30%" className="mb-4" />
      <div className="h-64 flex items-end justify-around space-x-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton 
            key={index} 
            height={`${20 + Math.random() * 60}%`}
            width="10%"
            variant="rectangular"
          />
        ))}
      </div>
    </div>
  );
}
