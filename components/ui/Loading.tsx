import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2 animate-pulse">
    <div className="w-4 h-4 bg-primary-600 rounded-full"></div>
    <div className="w-4 h-4 bg-health-600 rounded-full"></div>
    <div className="w-4 h-4 bg-primary-600 rounded-full"></div>
  </div>
);