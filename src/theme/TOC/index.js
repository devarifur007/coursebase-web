
import React, { useEffect } from 'react';
import TOC from '@theme-original/TOC';

export default function TOCWrapper(props) {
    useEffect(() => {
        const toc = document.querySelector('.theme-doc-toc-desktop');

        if (!toc) {
            return;
        }

        let observer;
        let frameId = null;
        let resumeTimer = null;
        let manualScrollUntil = 0;
        let lastTarget = null;
        let disposed = false;

        const MANUAL_PAUSE_MS = 1200;
        const EDGE_PADDING = 24;

        const getActiveItem = () =>
            toc.querySelector('.table-of-contents__link--active');

        const cancelPendingUpdate = () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
        };

        const pauseFollowing = () => {
            manualScrollUntil = Date.now() + MANUAL_PAUSE_MS;

            // Stop an in-progress smooth scroll when the user
            // takes control of the TOC.
            toc.scrollTo({
                top: toc.scrollTop,
                behavior: 'auto',
            });

            lastTarget = null;

            if (resumeTimer !== null) {
                clearTimeout(resumeTimer);
            }

            resumeTimer = setTimeout(() => {
                resumeTimer = null;
                scheduleUpdate();
            }, MANUAL_PAUSE_MS);
        };

        const updateActiveItem = () => {
            frameId = null;

            if (disposed || Date.now() < manualScrollUntil) {
                return;
            }

            const activeItem = getActiveItem();

            if (!activeItem) {
                lastTarget = null;
                return;
            }

            const tocRect = toc.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();

            // Keep the active item inside the visible TOC area.
            const visibleTop = tocRect.top + EDGE_PADDING;
            const visibleBottom = tocRect.bottom - EDGE_PADDING;

            let delta = 0;

            if (itemRect.top < visibleTop) {
                delta = itemRect.top - visibleTop;
            } else if (itemRect.bottom > visibleBottom) {
                delta = itemRect.bottom - visibleBottom;
            } else {
                // It's already visible: don't move the TOC.
                lastTarget = null;
                return;
            }

            const maxScroll = toc.scrollHeight - toc.clientHeight;

            if (maxScroll <= 0) {
                return;
            }

            const target = Math.max(
                0,
                Math.min(maxScroll, toc.scrollTop + delta),
            );

            // Avoid repeatedly requesting the same animation.
            if (
                lastTarget !== null &&
                Math.abs(target - lastTarget) < 2
            ) {
                return;
            }

            if (Math.abs(target - toc.scrollTop) < 2) {
                lastTarget = null;
                return;
            }

            lastTarget = target;

            toc.scrollTo({
                top: target,
                behavior: 'smooth',
            });
        };

        function scheduleUpdate() {
            if (disposed || frameId !== null) {
                return;
            }

            frameId = requestAnimationFrame(updateActiveItem);
        }

        // Detect Docusaurus active-link changes.
        observer = new MutationObserver(scheduleUpdate);

        observer.observe(toc, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });

        // Give manual TOC interaction priority over auto-follow.
        toc.addEventListener('wheel', pauseFollowing, {
            passive: true,
        });

        toc.addEventListener('touchstart', pauseFollowing, {
            passive: true,
        });

        toc.addEventListener('pointerdown', pauseFollowing, {
            passive: true,
        });

        toc.addEventListener('keydown', pauseFollowing);

        // Handle initial state.
        scheduleUpdate();

        return () => {
            disposed = true;

            observer?.disconnect();
            cancelPendingUpdate();

            if (resumeTimer !== null) {
                clearTimeout(resumeTimer);
            }

            toc.removeEventListener('wheel', pauseFollowing);
            toc.removeEventListener('touchstart', pauseFollowing);
            toc.removeEventListener('pointerdown', pauseFollowing);
            toc.removeEventListener('keydown', pauseFollowing);
        };
    }, []);

    return <TOC {...props} />;
}
