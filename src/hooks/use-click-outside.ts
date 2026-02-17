import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside of a referenced element
 * @param ref - React ref object pointing to the element
 * @param handler - Callback function that returns true if the event should be prevented
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
    ref: RefObject<T | null>,
    handler: (event: MouseEvent | TouchEvent) => boolean
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref?.current;

            // Do nothing if clicking ref's element or descendent elements
            if (!el || el.contains(event.target as Node)) {
                return;
            }

            // Call handler and if it returns true, prevent the action
            const shouldPrevent = handler(event);

            if (shouldPrevent) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        };

        // Use capture phase to intercept before other handlers
        document.addEventListener('mousedown', listener, true);
        document.addEventListener('click', listener, true);

        // Cleanup event listeners on unmount
        return () => {
            document.removeEventListener('mousedown', listener, true);
            document.removeEventListener('click', listener, true);
        };
    }, [ref, handler]);
}
