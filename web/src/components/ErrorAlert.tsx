import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onClose: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose }) => {
  return (
    <AlertDialog.Root open={!!message} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-md animate-scale-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                Error
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-600 mb-4">
                {message}
              </AlertDialog.Description>
              <div className="flex justify-end">
                <AlertDialog.Action asChild>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Close
                  </button>
                </AlertDialog.Action>
              </div>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default ErrorAlert;
