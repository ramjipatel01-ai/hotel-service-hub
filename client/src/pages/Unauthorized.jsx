import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge } from '../components/common';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { USER_ROLES } from '../utils/constants';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getHomePath = () => {
    switch (user?.role) {
      case USER_ROLES.GUEST:
        return '/guest';
      case USER_ROLES.STAFF:
        return '/staff';
      case USER_ROLES.ADMIN:
        return '/admin';
      case USER_ROLES.MANAGER:
        return '/manager';
      default:
        return '/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Card className="p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">
            You do not have the required role permissions to access this portal area.
          </p>

          {user && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block text-xs text-slate-600">
              Active Role:{' '}
              <Badge variant="indigo" className="ml-1">
                {user.role}
              </Badge>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(-1)}
              icon={ArrowLeft}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(getHomePath())}
              icon={Home}
              className="w-full sm:w-auto"
            >
              Return to My Portal
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
