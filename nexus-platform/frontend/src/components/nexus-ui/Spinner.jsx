import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 24, className }) => {
    return (
        <Loader2
            size={size}
            className={cn("animate-spin text-blue-600 dark:text-blue-400", className)}
        />
    );
};

export default Spinner;
