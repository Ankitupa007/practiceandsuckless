import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for className merging

interface NothingCheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    loading?: boolean; // New loading prop
    className?: string;
}

export const NothingCheckbox = ({
                                    checked,
                                    onCheckedChange,
                                    disabled = false,
                                    loading = false,
                                    className,
                                }: NothingCheckboxProps) => {
    return (
        <div
            className={cn(
                'relative flex cursor-pointer items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all duration-300 ease-in-out',
                checked && !loading
                    ? 'bg-red-600 dark:bg-white border-transparent'
                    : 'bg-transparent border-gray-300 dark:border-gray-600 hover:border-gray-500',
                (disabled || loading) && 'opacity-50 cursor-not-allowed',
                className
            )}
            onClick={() => !disabled && !loading && onCheckedChange(!checked)}
        >
            {loading ? (
                <span
                    className="w-3 h-3 md:w-4 md:h-4 border-2 border-t-transparent border-gray-500 dark:border-gray-400 rounded-full animate-spin"
                />
            ) : (
                <Check
                    className={cn(
                        'w-4 h-4 md:w-5 md:h-5 text-white dark:text-black transition-all duration-200',
                        checked ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    )}
                />
            )}
            {/* Subtle ripple effect on check */}
            {checked && !disabled && !loading && (
                <span
                    className="absolute inset-0 rounded-full bg-black/10 dark:bg-white/10 animate-ping"
                    style={{ animationDuration: '0.6s' }}
                />
            )}
        </div>
    );
};