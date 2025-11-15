import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'full' | 'icon-only';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'full' }) => {
  const { mode, setTheme } = useTheme();

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
  ];

  const currentTheme = themeOptions.find(option => option.value === mode);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
          aria-haspopup="menu"
        >
          {currentTheme?.icon}
          {variant === 'full' && <span>{currentTheme?.label}</span>}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[160px] bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50"
          sideOffset={5}
        >
          {themeOptions.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
              onClick={() => setTheme(option.value)}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
              {mode === option.value && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default ThemeToggle;
