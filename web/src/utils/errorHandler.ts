/**
 * Error handling utilities for consistent error messages across the application
 */

export interface ApiError {
  status: number;
  message: string;
  code: string;
}

/**
 * Format error message for display to users
 */
export const formatErrorMessage = (error: any): string => {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle ApiError format from axios interceptor
  if (error.message) {
    return error.message;
  }

  // Handle axios error format
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return 'Network error. Please check your connection and try again.';
  }

  // Handle specific HTTP status codes
  if (error.status || error.response?.status) {
    const status = error.status || error.response.status;
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This operation conflicts with existing data.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `An error occurred (${status}). Please try again.`;
    }
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Get error code from error object
 */
export const getErrorCode = (error: any): string => {
  if (error.code) {
    return error.code;
  }
  if (error.response?.data?.error?.code) {
    return error.response.data.error.code;
  }
  return 'UNKNOWN_ERROR';
};

/**
 * Check if error is a specific type
 */
export const isErrorType = (error: any, errorCode: string): boolean => {
  return getErrorCode(error) === errorCode;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  return (
    getErrorCode(error) === 'NETWORK_ERROR' ||
    error.message === 'Network Error' ||
    !error.response
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  const status = error.status || error.response?.status;
  return status === 401;
};
