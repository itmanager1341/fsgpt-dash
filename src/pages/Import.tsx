
import ProtectedRoute from '@/components/ProtectedRoute';
import React from 'react';
import ImportPanel from '@/components/ImportPanel';

const Import = () => {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <ImportPanel />
      </div>
    </ProtectedRoute>
  );
};

export default Import;
