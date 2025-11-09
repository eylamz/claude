import { FC } from 'react';

export const AdminDashboard: FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold">Users</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold">Products</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-semibold">Orders</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
};


