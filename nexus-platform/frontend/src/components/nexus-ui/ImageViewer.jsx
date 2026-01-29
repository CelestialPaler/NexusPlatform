import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ImageViewer = React.forwardRef(({
    src,
    alt,
    className,
    wrapperClassName,
    objectFit = 'contain', // contain, cover, fill, none, scale-down
    width,
    height,
    ...props
}, ref) => {
    return (
        <div className={cn("flex justify-center items-center overflow-hidden", wrapperClassName)} style={{ width, height }}>
            <img
                ref={ref}
                src={src}
                alt={alt || "Image"}
                className={cn(
                    "max-w-full h-auto",
                    objectFit === 'cover' && "w-full h-full object-cover",
                    objectFit === 'contain' && "w-full h-full object-contain",
                    className
                )}
                {...props}
            />
        </div>
    );
});

ImageViewer.displayName = 'ImageViewer';
export default ImageViewer;
